# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy everything first — including Prisma schema
COPY . .

# Install dependencies (postinstall will now work since schema is present)
RUN npm install

# Expose port
EXPOSE 5000

# Start the app
CMD ["node", "src/app.js"]
