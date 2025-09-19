FROM us-docker.pkg.dev/berglas/berglas/berglas:2.0.8 AS berglas
FROM node:22

COPY --from=berglas /bin/berglas bin/berglas

RUN apt update && apt install -y libasound2
RUN mkdir -p /app/shared /app/backend
COPY shared/ /app/shared/
COPY backend/ /app/backend/

WORKDIR /app/backend
RUN npm ci

EXPOSE 3000

ENTRYPOINT ["npm", "start"]