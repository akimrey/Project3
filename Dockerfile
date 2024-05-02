# Use the latest Python image as the base image
FROM python:latest

# Set the working directory in the container to /app
WORKDIR /app

# Copy the contents of the local project directory to the /app directory in the container
COPY . /app

# Install poetry
RUN pip install poetry

# Install project dependencies using poetry
RUN poetry config virtualenvs.create false \
    && poetry install


# Adjust the ENTRYPOINT to point to the main module in the correct subdirectory
ENTRYPOINT ["uvicorn", "main:app", "--host", "0.0.0.0"]
