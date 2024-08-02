# Use an official Node.js runtime as the base image
FROM node:18-alpine

# Install Python and build dependencies
RUN apk add --no-cache python3 py3-pip make g++ git pkgconfig autoconf automake libtool nasm

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json ./

# Install the application dependencies
RUN npm i  --force

# Copy the rest of the application code to the working directory
COPY . .

# Build the TypeScript project
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]