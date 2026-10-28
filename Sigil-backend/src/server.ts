import app from './app';

const port = Number(process.env.PORT || '4000');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

app.listen(port, () => {
    console.log(`SIGIL.IA API listening on http://localhost:${port}`);
});
