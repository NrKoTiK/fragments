# adding some test comment cus idk what am doing fr
FROM node:22.19.0

LABEL maintainer="Ahmad Syed (asyed113@myseneca.ca)"
LABEL description="Fragments node.js microservice"

ENV PORT=8080
# We run our service on port 8080
EXPOSE 8080

# Reduce npm spam when installing within Docker
# https://docs.npmjs.com/cli/v8/using-npm/config#loglevel
ENV NPM_CONFIG_LOGLEVEL=warn

# Disable colour when run inside Docker
# https://docs.npmjs.com/cli/v8/using-npm/config#color
ENV NPM_CONFIG_COLOR=false

# Use /app as our working directory
WORKDIR /app

# Copy the package.json and package-lock.json
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy src to /app/src/
COPY ./src ./src

# Copy our HTPASSWD file
COPY ./tests/.htpasswd ./tests/.htpasswd

# Start the container by running our server
CMD npm start
