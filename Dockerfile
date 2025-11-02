# adding some test comment cus idk what am doing fr
FROM node:22.19.0-alpine@sha256:d2166de198f26e17e5a442f537754dd616ab069c47cc57b889310a717e0abbf9

LABEL maintainer="Ahmad Syed (asyed113@myseneca.ca)"
LABEL description="Fragments node.js microservice"

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
RUN npm ci --only=production

#stage 2 - production image
FROM node:22.19.0-alpine@sha256:d2166de198f26e17e5a442f537754dd616ab069c47cc57b889310a717e0abbf9 AS production

# Production environment
ENV NODE_ENV=production

ENV PORT=8080
# We run our service on port 8080
EXPOSE 8080

WORKDIR /app

COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# Copy package files
COPY --chown=node:node package*.json ./

# Copy src to /app/src/
COPY --chown=node:node ./src ./src

# Copy our HTPASSWD file
COPY --chown=node:node ./tests/.htpasswd ./tests/.htpasswd

USER node

# Start the container by running our server
CMD ["npm", "start"]
