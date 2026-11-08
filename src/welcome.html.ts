export function getWelcomeHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SHAVARCHALA SHANTI SANGHA Server</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #006a4e;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 1.5rem;
      padding: 3.5rem 2.5rem;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      animation: fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 1.75rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.3;
      margin-bottom: 1.25rem;
      letter-spacing: -0.025em;
    }
    p {
      font-size: 1.125rem;
      opacity: 0.92;
      line-height: 1.6;
      margin-bottom: 2.25rem;
    }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.8rem 1.6rem;
      border-radius: 0.6rem;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.95rem;
      transition: all 0.2s ease-in-out;
      cursor: pointer;
    }
    .btn-primary {
      background-color: #ffffff;
      color: #006a4e;
      border: 1px solid #ffffff;
    }
    .btn-primary:hover {
      background-color: #f0fdf4;
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
    }
    .btn-secondary {
      background-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.35);
    }
    .btn-secondary:hover {
      background-color: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.6);
      transform: translateY(-2px);
    }
    .footer {
      margin-top: 2rem;
      font-size: 0.85rem;
      opacity: 0.75;
    }
  </style>
</head>
<body class="bg-[#006a4e]">
  <div class="card">
    <div class="badge">
      <span class="badge-dot"></span>
      Server Running
    </div>
    <h1>welcome to SHAVARCHALA SHANTI SANGHA server</h1>
    <p>The server is up and running successfully on port 5000.</p>
    <div class="actions">
      <a href="/api/docs" class="btn btn-primary">
        <span>📖</span> API Documentation
      </a>
      <a href="/api/v1/health" class="btn btn-secondary">
        <span>💚</span> Health Check
      </a>
    </div>
  </div>
  <div class="footer">
    SHAVARCHALA SHANTI SANGHA Server &bull; Running on localhost:5000
  </div>
</body>
</html>`;
}
