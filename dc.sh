#!/bin/bash
# Helper script for docker-compose with .env.docker

docker-compose --env-file .env.docker "$@"