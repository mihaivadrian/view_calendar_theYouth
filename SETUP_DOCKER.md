# Setup Docker Backend pentru The Youth Calendar

## Prezentare generală

Backend-ul Docker sincronizează automat rezervările din Microsoft Bookings la fiecare 5 minute.
Frontend-ul se conectează la acest server și afișează datele instant.

## Pasul 1: Configurare Azure AD App (Client Credentials)

Ai nevoie de o aplicație Azure AD cu permisiuni de tip **Application** (nu Delegated).

### 1.1 Creează sau modifică App Registration

1. Mergi la [Azure Portal](https://portal.azure.com)
2. Navighează la **Azure Active Directory** → **App registrations**
3. Creează o nouă aplicație sau folosește-o pe cea existentă

### 1.2 Adaugă permisiuni Application

1. Selectează aplicația → **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Adaugă următoarele permisiuni:
   - `Bookings.Read.All` - Citește rezervările
   - `BookingsAppointment.ReadWrite.All` - Citește/scrie programările
   - `User.Read.All` - Citește utilizatorii (optional)
4. Click **Grant admin consent** pentru organizația ta

### 1.3 Creează Client Secret

1. Selectează aplicația → **Certificates & secrets**
2. Click **New client secret**
3. Setează o descriere și un termen de expirare (24 luni recomandat)
4. **IMPORTANT**: Copiază imediat valoarea secretului - nu mai poate fi văzută după!

### 1.4 Notează credentialele

Vei avea nevoie de:
- **Tenant ID**: pe pagina Overview a aplicației
- **Client ID**: pe pagina Overview a aplicației (Application ID)
- **Client Secret**: valoarea copiată la pasul anterior

## Pasul 2: Configurare environment

1. Copiază fișierul `.env.example` în `.env`:

```bash
cp .env.example .env
```

2. Editează `.env` cu valorile tale:

```env
MS_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MS_CLIENT_SECRET=your-secret-value-here
MS_BOOKING_BUSINESS_ID=
```

**Notă**: `MS_BOOKING_BUSINESS_ID` poate fi lăsat gol - serverul va folosi primul business găsit.

## Pasul 3: Pornire Docker

### Metoda 1: Docker Compose (recomandat)

```bash
# Din directorul proiectului
cd the-youth-calendar

# Pornește backend-ul
docker-compose up -d

# Vezi log-urile
docker-compose logs -f backend
```

### Metoda 2: Manual cu Docker

```bash
# Build imaginea
docker build -t youth-calendar-backend ./backend

# Rulează containerul
docker run -d \
  --name youth-calendar-backend \
  -p 3001:3001 \
  -v $(pwd)/backend/data:/app/data \
  -e MS_TENANT_ID=your-tenant-id \
  -e MS_CLIENT_ID=your-client-id \
  -e MS_CLIENT_SECRET=your-secret \
  youth-calendar-backend
```

## Pasul 4: Verificare

1. Verifică health endpoint:
```bash
curl http://localhost:3001/api/health
# Răspuns: {"status":"ok"}
```

2. Verifică status-ul sincronizării:
```bash
curl http://localhost:3001/api/sync/status
```

3. Declanșează manual o sincronizare:
```bash
curl -X POST http://localhost:3001/api/sync/trigger
```

## Pasul 5: Configurare Frontend

Frontend-ul trebuie să știe adresa serverului. Editează `.env` sau `.env.local` în directorul principal:

```env
VITE_API_URL=http://localhost:3001
```

Pentru producție, schimbă cu adresa serverului:
```env
VITE_API_URL=https://your-server.com:3001
```

Apoi pornește frontend-ul:
```bash
npm run dev
```

## Structura Fișierelor

```
the-youth-calendar/
├── backend/
│   ├── data/                    # Baza de date SQLite (persistentă)
│   │   └── bookings.db
│   ├── src/
│   │   ├── index.js            # Server Express + cron job
│   │   ├── database.js         # Operații SQLite
│   │   └── syncService.js      # Sincronizare Microsoft Graph
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env                         # Credențiale (nu commita!)
└── .env.example
```

## Cum funcționează

1. **La pornire**: Serverul sincronizează toate cele 19 luni (6 în trecut + luna curentă + 12 în viitor)
2. **La fiecare 5 minute**: Cron job sincronizează automat
3. **La cerere**: Frontend-ul poate declanșa sincronizare manuală prin `/api/sync/trigger`
4. **Frontend**: Doar citește din baza de date - nu mai sincronizează local

## Troubleshooting

### "Missing credentials"
Verifică că variabilele de mediu sunt setate corect în `.env`.

### "Failed to get token"
- Verifică Tenant ID și Client ID
- Verifică că Client Secret nu a expirat
- Asigură-te că ai acordat admin consent pentru permisiuni

### "No booking businesses found"
- Verifică că ai permisiunea `Bookings.Read.All` cu admin consent
- Verifică că există cel puțin un Booking Business în organizație

### Container-ul nu pornește
```bash
# Vezi log-urile
docker-compose logs backend

# Rebuild și repornește
docker-compose down
docker-compose up --build -d
```

### Baza de date nu persistă
Verifică că volumul e montat corect: `./backend/data:/app/data`

## API Endpoints

| Endpoint | Metodă | Descriere |
|----------|--------|-----------|
| `/api/health` | GET | Health check |
| `/api/bookings?start=&end=` | GET | Rezervări în interval |
| `/api/bookings/month/:monthKey` | GET | Rezervări pentru o lună (YYYY-MM) |
| `/api/sync/status` | GET | Status sincronizare |
| `/api/sync/trigger` | POST | Declanșează sincronizare manuală |

## Producție

Pentru deploy în producție:

1. Folosește un reverse proxy (nginx) pentru HTTPS
2. Configurează un server de baze de date dedicat (opțional)
3. Setează variabilele de mediu pe server
4. Configurează restart automat pentru container
