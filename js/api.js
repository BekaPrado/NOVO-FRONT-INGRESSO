const API_URL = 'http://localhost:5050/v1/100open';


async function apiGet(endpoint) {
const response = await fetch(`${API_URL}${endpoint}`);
return response.json();
}


async function apiPost(endpoint, data) {
const response = await fetch(`${API_URL}${endpoint}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(data)
});
return response.json();
}


async function apiPut(endpoint, data) {
const response = await fetch(`${API_URL}${endpoint}`, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(data)
});
return response.json();
}


async function apiDelete(endpoint) {
const response = await fetch(`${API_URL}${endpoint}`, { method: 'DELETE' });
return response.json();
}


// Helper existente, agora usando apiGet padronizado
async function getEventos() {
try {
const data = await apiGet('/evento');
console.log('DEBUG eventos:', data);
return data.eventos || data.dados || [];
} catch (err) {
console.error('Erro ao buscar eventos:', err);
return [];
}
}


// expõe no escopo global para ser usado em outros arquivos
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPut = apiPut;
window.apiDelete = apiDelete;
window.getEventos = getEventos;