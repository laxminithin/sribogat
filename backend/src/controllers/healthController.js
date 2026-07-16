export function getHealth(req, res) {
  res.json({
    status: 'UP',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
}
