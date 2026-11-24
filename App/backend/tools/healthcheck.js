/** Exit successfully only when the local application reports database readiness. */
try {
  const response = await fetch('http://127.0.0.1:3000/api/health');
  process.exit((await response.json()).ready ? 0 : 1);
} catch {
  process.exit(1);
}
