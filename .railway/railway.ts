import { defineRailway, github, project, service, volume } from 'railway/iac';

export default defineRailway(() => {
  const messages = volume('messages', { sizeMB: 512, region: 'us-west2' });
  const api = service('api', {
    source: github('WillRaphaelson/railway-react-contact-form', { branch: 'main', rootDirectory: '/api' }),
    start: 'npm start',
    healthcheck: '/health',
    deploy: { region: 'us-west2' },
    env: { PORT: '3001', DATA_DIR: '/data' },
    volumeMounts: { '/data': messages },
  });
  const web = service('web', {
    source: github('WillRaphaelson/railway-react-contact-form', { branch: 'main', rootDirectory: '/frontend' }),
    build: 'npm run build',
    start: 'npm start',
    healthcheck: '/health',
    deploy: { region: 'us-west2' },
    env: { API_URL: `http://${api.env.RAILWAY_PRIVATE_DOMAIN}:3001`, PORT: '3000' },
  });
  return project('react-contact-form', { resources: [web, api, messages] });
});
