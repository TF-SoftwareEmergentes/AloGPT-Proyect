#!/bin/bash

# Initialize PostgreSQL database
echo "Initializing PostgreSQL database..."

psql -U postgres -h localhost -c "CREATE DATABASE promise_analyzer;" 2>/dev/null || echo "Database already exists"

psql -U postgres -h localhost -d promise_analyzer -f init.sql

echo "Database initialized!"
