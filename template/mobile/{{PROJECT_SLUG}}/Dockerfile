FROM node:20-slim
WORKDIR /app
COPY package.json ./
# Install dependencies, allowing legacy peer deps if needed by Expo packages
RUN npm install
COPY . .
EXPOSE 8081
ENV EXPO_OFFLINE=1
CMD ["npx", "expo", "start"]
