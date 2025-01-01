import express from 'express';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const app = express();
app.use(express.static('core'));

const handlePage = (page) => (req, res) => {
  res.sendFile(`${__dirname}/core/${page}.html`);
};

app.get('/', handlePage('index'));
app.get('/play', handlePage('play'));

const handleError = () => (req, res) => {
  res.status(404).sendFile(`${__dirname}/core/404.html`);
};
app.get('*', handleError());

app.listen(8080, () => {
  console.log('Server running on port 8080');
});
