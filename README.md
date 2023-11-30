<p align="center">
  <h1 align="center">Prime</h1>
</p>
<p align="center">
<b><a href="https://github.com/ritual-net/prime#about">About</a></b>
|
<b><a href="https://github.com/ritual-net/prime#architecture">Architecture</a></b>
|
<b><a href="https://github.com/ritual-net/prime#usage">Usage</a></b>
|
<b><a href="https://github.com/ritual-net/prime#customization">Customization</a></b>
</p>

## About

Prime is a one-click toolkit for provisioning servers to deploy and serve Large Language Models (LLMs).

- Cloud provider agnostic for flexible deployments
- Fine-grained access controls with ACL permission system
- Out-of-the-box inference playground support with client-side PII redaction
- Inference engine powered by [text-generation-inference](https://github.com/huggingface/text-generation-inference)

## Architecture

Generally, the idea behind Prime is simple—to act as a managed interface that connects to other inference providing solutions (a la Paperspace, CoreWeave, Fluidstack, etc.).

### Technology

- TypeScript
- Frontend:
  - [NextJS](https://nextjs.org/) as React framework
  - [TailwindCSS](https://tailwindcss.com/) as CSS framework
  - [shadcn/ui](https://ui.shadcn.com/) as component library
- Backend:
  - [NextJS serverless functions](https://vercel.com/docs/concepts/functions/serverless-functions)
  - [Prisma](https://prisma.io) as database ORM connecting to Postgres

### System

1. Users authenticate via [passwordless email magic links](./pages/api/auth/[...nextauth].ts)
2. Users are approved by admin users
3. There is a hierarchy of [permission ACLs](./utils/auth.ts)
4. Users can create inference servers across any ML inference provider that is implemented ([extending BaseProvider](./ml/base.ts))
   a. Currently, only [Paperspace](#paperspace) is supported.

### Supported cloud providers

#### Paperspace

[Paperspace](https://www.paperspace.com/) is the only cloud GPU provider currently supported out-of-the-box.

##### Account

To use Paperspace, you will need an account (email, password) and API key. Note that:

1. **Credentials for each ML provider are shared across all users of a Prime server.** In other words, each user cannot use their individual account to deploy machines; only one account is used. **Therefore, we highly recommended you only add users you trust.**
2. Paperspace restricts the amount and type of machines a new account is allowed to deploy. Therefore, you will have to [request access and limit increases](https://docs.paperspace.com/core/quota-limits/) for the types of machines you want to deploy, depending on your use case.

## Usage

### Environment setup

See [.env.example](.env.sample) for setting up your environment variables correctly. Put your variables in a file named `.env`.

```bash
cp .env.sample .env
vim .env
```

**For running Prime, you will need:** (skip if using Docker)

- A Postgres database for prime (or use the test one, see [Locally](#run-without-docker))
- SendGrid credentials (or use the test ones, see [Locally](#run-with-docker))

**For deploying TGI to Paperspace, you will need:**

- A Postgres database for TGI logs
  - See [Log Database setup](#optional-setup-log-forwarding-database) below
- Optionally, [Hugging Face](https://huggingface.co/) credentials for running gated models (e.g. Llama2) or private ones (i.e. your own org's finetuned models)

### Run with Docker

1. Install [Docker](https://docs.docker.com/get-docker/)
2. Install [Tilt](https://docs.tilt.dev/)
3. Run `tilt up`
4. (optionally) Press space to open the tilt manager
5. To shut down all containers, run `tilt down`

Services will be started at:

- Tilt manager: [localhost:10350](http://localhost:10350/)
- Frontend: [localhost:3000](http://localhost:3000/)
- Backend: [localhost:3000/api](http://localhost:3000/api)
- MailHog UI: [localhost:8025](http://localhost:8025/)
- Postgres: `localhost:5432` (user: `postgres`, pw: `postgres`)

If this is your first time logging in, a new user will be created with email `admin@ritual.com` with ADMIN privileges.

### Run without Docker

The docker container makes a new NextJS production build on each save (although optimized for dependency diffing, not as instantaneous as true HMR).

To make use of the NextJS hot-reload and bring your iteration cycles down from ~5s/change -> ~50ms/change, it is better to develop locally.

1. Either install Postgres (great utility for MAC users is [postgres.app](https://postgresapp.com/)) or selectively run the Postgres container.
   a. Run `npx prisma generate` to generate the db schema using [Prisma](https://www.prisma.io)
2. Either slot in SendGrid credentials or selectively run the Mailhog SMTP container.
3. If you don't have `pnpm` install via `npm i -g pnpm`.
4. Run `pnpm install` and `pnpm run dev`

### Setup Postgres

Use the following commands to setup your Postgres database, whether running with or without Docker.

Using [Prisma](https://www.prisma.io):
b. Run `npx prisma migrate dev --name init` to generate the initial migration file.
c. Run `npx prisma migrate deploy` to deploy the migration, creating the necessary tables etc.
d. Run `npx prisma db seed` to create initial admin user for testing.

### [Optional] Setup log forwarding database

You can optionally instrument your deployment of [text-generation-inference](https://github.com/huggingface/text-generation-inference) to add logs via [fluentbit](https://fluentbit.com). You can host a log database anywhere you like, and provide the connection parameters [here](.env.sample#L13-L17). After creating the database, execute the following query to create a `"fluentbit"` table:

```
-- Table: public.fluentbit
-- DROP TABLE IF EXISTS public.fluentbit;
CREATE TABLE IF NOT EXISTS public.fluentbit
(
  tag character varying COLLATE pg_catalog."default",
  "time" timestamp without time zone,
  data jsonb
)
TABLESPACE pg_default;
```

## Customization

You can easily extend the Prime user interface:

- We show a **limited selection of HuggingFace models** that can be deployed via the UI. Depending on the use case, you may want to add or remove some. To enable deploying a public (or private, assuming your [key](.env.sample#L27) has access to it) model via the UI, add it to the [whitelist](./types/ml/model.ts#L1).
- We show a **limited selection of inference server parameters** that can be configured via the UI. Depending on the use case, you may want to add or remove some. To modify or extend the inference server parameters available in the UI, see `INFERENCE_OPTIONS` and `RUN_OPTIONS` in [tgi](./utils/tgi.ts).
- We show a **limited selection of Paperspace machines** that can be deployed via the UI. Depending on the use case, you may want to add or remove some. To enable deploying other machine types, add them to the [whitelist](./types/ml/paperspace.ts#L1-L12) by **GPU name**.
- We show a **limited selection of Paperspace OS templates** that can be deployed via the UI. Depending on the use case, you may want to add or remove some. To enable deploying other Operating Systems [templates](https://docs.paperspace.com/core/api-reference/templates), add them to the [whitelist](./types/ml/paperspace.ts#L14) by **id**.

## License

[BSD 3-clause Clear](./LICENSE)
