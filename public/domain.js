// Keep browser authentication on one canonical origin. API/webhook URLs stay available.
if (location.hostname === 'cyclingdata.vercel.app') {
  const destination = new URL(location.href);
  destination.protocol = 'https:';
  destination.host = 'ridevector.app';
  location.replace(destination.href);
}
