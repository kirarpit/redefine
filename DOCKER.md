# Docker Setup for Redefine Project

This document explains how to build and run the Redefine project using Docker. The provided Dockerfile and Docker Compose configuration create a containerized environment with both the frontend and backend components, as well as a PostgreSQL database.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git repository cloned locally

## Environment Setup

### Creating your .env file

The application uses environment variables for configuration. A sample `.env.example` file is provided as a template.

1. Copy the example file to create your own `.env` file:

```bash
cp .env.example .env
```

2. Edit the `.env` file to customize settings:
   - For security, change the default database password (DB_PASSWORD)
   - Set a strong SALT_KEY (at least 16 characters)
   - Add any optional API keys needed for your use case

**Important**: The SALT_KEY is used for encrypting sensitive data. Once you've started using the application, do not change this key or you'll lose access to encrypted data.

### Required Environment Variables

The following environment variables are required:

| Variable    | Description                                   | Default Value     |
| ----------- | --------------------------------------------- | ----------------- |
| DB_USER     | PostgreSQL database username                  | redefine          |
| DB_PASSWORD | PostgreSQL database password                  | redefine_password |
| DB_NAME     | PostgreSQL database name                      | redefine          |
| SALT_KEY    | Secret key for encrypting/decrypting API keys | _(Must be set)_   |

## Running with Docker Compose (Recommended)

The easiest way to run the application is using Docker Compose, which will set up both the application and a PostgreSQL database:

### 1. Start the application

```bash
docker-compose up -d
```

This command:

- Builds the application image if it doesn't exist
- Starts both the application and PostgreSQL database
- Runs containers in the background (-d flag)
- Uses the environment variables from your `.env` file

### 2. Accessing the application

Once the containers are running:

- The API and frontend will be available at `http://localhost:5612/`
- The PostgreSQL database will be available at `localhost:5432`

## Running with Docker (Application Only)

If you want to run just the application container and use an external database:

### 1. Build the Docker image

```bash
docker build -t redefine:latest .
```

### 2. Run the container

```bash
docker run -p 5612:5612 \
  -e DATABASE_URL="postgresql://user:password@host:port/dbname" \
  -e SALT_KEY="your_secure_random_string" \
  -e GOOGLE_API_KEY="your_google_api_key" \
  -e OPENAI_API_KEY="your_openai_api_key" \
  redefine:latest
```

## Managing the Database

The PostgreSQL database is configured with the credentials defined in your `.env` file:

- User: The value of DB_USER (default: redefine)
- Password: The value of DB_PASSWORD (default: redefine_password)
- Database: The value of DB_NAME (default: redefine)

Data is persisted in a Docker volume named `postgres_data`.

### Connecting to the database

To connect to the database from your host machine:

```bash
psql -h localhost -p 5432 -U $DB_USER -d $DB_NAME
```

You'll be prompted for the password defined in your .env file.

### Backup and Restore

#### Creating a database backup

To backup your PostgreSQL database:

```bash
# Full database dump (all databases, users, and privileges)
docker-compose exec db pg_dumpall -c -U $DB_USER > backup_$(date +%Y-%m-%d_%H-%M-%S).sql

# Single database dump (application data only)
docker-compose exec db pg_dump -c -U $DB_USER $DB_NAME > db_backup_$(date +%Y-%m-%d_%H-%M-%S).sql
```

#### Restoring from a backup

To restore your database from a backup file:

```bash
# Stop the containers but keep the volumes
docker-compose down

# Start just the database
docker-compose up -d db

# Wait for the database to start
sleep 5

# Restore from backup
cat your_backup_file.sql | docker-compose exec -T db psql -U $DB_USER -d $DB_NAME

# Start the rest of the services
docker-compose up -d
```

#### Accessing the database volume directly

The PostgreSQL data is stored in a Docker volume. On most systems, this is located at:

```
/var/lib/docker/volumes/redefine_postgres_data/_data
```

You may need root permissions to access this directory.

## Troubleshooting

If you encounter any issues:

1. Check Docker logs:

   ```bash
   docker-compose logs app
   docker-compose logs db
   ```

2. Ensure the .env file is properly set up:

   - Make sure you've copied .env.example to .env
   - Verify all required variables are set properly
   - Check if the SALT_KEY is at least 16 characters

3. Database connection issues:

   - Verify that the PostgreSQL container is running: `docker-compose ps`
   - Check if the database credentials in the .env file are correct
   - Ensure the database has been initialized properly

4. Port conflicts:
   - If port 5612 or 5432 is already in use, modify the port mappings in the docker-compose.yml file

## Development Workflow

For development purposes:

1. Rebuild and restart containers after code changes:

   ```bash
   docker-compose down
   docker-compose up --build
   ```

2. Access container shells for debugging:

   ```bash
   docker-compose exec app bash
   docker-compose exec db bash
   ```

3. View database contents:
   ```bash
   docker-compose exec db psql -U $DB_USER -d $DB_NAME
   ```

For more complex setups or production deployment, consider customizing the Docker Compose configuration or using Docker Swarm or Kubernetes.
