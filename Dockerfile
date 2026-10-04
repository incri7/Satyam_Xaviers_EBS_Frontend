# Stage 1 — build the React app
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# In Docker, the frontend always talks to nginx at /api/
ARG VITE_API_BASE_URL=/api/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# Stage 2 — build the public website (website/, its own Vite app)
FROM node:20-alpine AS website

WORKDIR /website

COPY website/package*.json ./
RUN npm ci

COPY website/ ./

RUN npm run build


# Stage 3 — serve both with Nginx: the website at /, /en and /ne, the app everywhere else
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=website /website/dist /usr/share/nginx/site
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
