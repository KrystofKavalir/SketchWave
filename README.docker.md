Docker instructions for SketchWave

Build and run with Docker:

1) Build image:
   docker build -t sketchwave:latest .

2) Run container:
   docker run -p 3000:3000 --name sketchwave -d sketchwave:latest

Using docker-compose:

1) Start:
   docker-compose up --build -d

2) Stop:
   docker-compose down

Notes:
- The Dockerfile uses a production install (npm ci --only=production). If you need dev tools like nodemon inside the container, modify the Dockerfile or use docker-compose with a development service.
- The container exposes port 3000.
- Ensure you don't copy any sensitive files (use .dockerignore).
