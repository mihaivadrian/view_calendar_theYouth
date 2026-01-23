# Youth Calendar - Ghid Troubleshooting Producție

## Problemă Rezolvată: Detaliile rezervărilor nu apar în calendar

### Simptome
- Calendarul afișează evenimente cu titlul generic "Rezervare săli - The Youth"
- Nu se văd: numele clientului, descrierea activității, numărul de participanți
- Debug Panel arată booking-uri în IndexedDB dar nu apar în UI

---

## Arhitectura Sistemului

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Microsoft      │────▶│  Node.js Backend │────▶│  SQLite Database    │
│  Bookings API   │     │  (port 3001)     │     │  (bookings.db)      │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Nginx           │
                        │  (proxy /api)    │
                        └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Frontend React  │
                        │  (dist/)         │
                        └──────────────────┘
```

---

## Fișiere și Locații Importante

### Server Producție
- **IP:** 89.44.137.225
- **User:** root
- **Proiect:** `/var/www/view_calendar_theYouth`
- **Backend:** `/var/www/view_calendar_theYouth/backend`
- **Database:** `/var/www/view_calendar_theYouth/backend/data/bookings.db`
- **Nginx config:** `/etc/nginx/sites-available/view_calendar`
- **PM2 logs:** `pm2 logs youth-calendar-backend`

### Credențiale Azure AD
- **Tenant ID:** `670526f9-b5e7-462f-a429-c91d5e2a14c6`
- **Client ID:** `1c4f8b66-2145-46f9-a0c1-e30bcad818d0`
- **Client Secret:** `<VEZI_AZURE_PORTAL_SAU_ADMINISTRATOR>`
- **Booking Business ID:** `RezervaresliTheYouth@rotineret.ro`

> **Notă:** Client Secret-ul se găsește în Azure Portal → App registrations → Certificates & secrets.
> Nu stoca secretul în cod sau documentație publică!

---

## Comenzi Utile

### Verificare Status
```bash
# SSH la server
ssh root@89.44.137.225

# Status PM2
pm2 list
pm2 logs youth-calendar-backend --lines 50

# Test API local
curl http://localhost:3001/api/health
curl http://localhost:3001/api/sync/status
curl "http://localhost:3001/api/bookings?start=2026-01-23T00:00:00Z&end=2026-01-24T00:00:00Z" | jq length

# Test nginx proxy
curl https://view-calendar-theyouth.rotineret.ro/api/health
```

### Restart Backend
```bash
cd /var/www/view_calendar_theYouth/backend

pm2 delete youth-calendar-backend

MS_TENANT_ID=670526f9-b5e7-462f-a429-c91d5e2a14c6 \
MS_CLIENT_ID=1c4f8b66-2145-46f9-a0c1-e30bcad818d0 \
MS_CLIENT_SECRET='$MS_CLIENT_SECRET' \
MS_BOOKING_BUSINESS_ID='RezervaresliTheYouth@rotineret.ro' \
pm2 start src/index.js --name youth-calendar-backend

pm2 save
```

### Rebuild și Deploy
```bash
cd /var/www/view_calendar_theYouth
git pull origin main
npm run build

# Restart backend dacă s-au schimbat fișierele din backend/
pm2 restart youth-calendar-backend
```

### Forțare Sync Manual
```bash
# Trigger sync prin API
curl -X POST http://localhost:3001/api/sync/trigger

# Sau din frontend: Debug Panel → Full Resync
```

---

## Probleme Comune și Soluții

### 1. "Missing Microsoft Graph credentials"
**Cauză:** Backend-ul nu are variabilele de mediu setate.

**Soluție:**
```bash
pm2 delete youth-calendar-backend
# Repornește cu toate variabilele de mediu (vezi secțiunea Restart Backend)
```

### 2. API returnează 0 booking-uri
**Verificare:**
```bash
# Verifică dacă sync-ul a rulat
pm2 logs youth-calendar-backend --lines 100 | grep "Sync complete"

# Verifică direct Microsoft Bookings API
TOKEN=$(curl -s -X POST "https://login.microsoftonline.com/670526f9-b5e7-462f-a429-c91d5e2a14c6/oauth2/v2.0/token" \
  --data-urlencode "client_id=1c4f8b66-2145-46f9-a0c1-e30bcad818d0" \
  --data-urlencode "client_secret=$MS_CLIENT_SECRET" \
  --data-urlencode "scope=https://graph.microsoft.com/.default" \
  --data-urlencode "grant_type=client_credentials" | jq -r '.access_token')

curl -s "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/RezervaresliTheYouth@rotineret.ro/calendarView?start=2026-01-23T00:00:00Z&end=2026-01-24T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN" | jq '.value | length'
```

**Soluție:** Forțează sync: `curl -X POST http://localhost:3001/api/sync/trigger`

### 3. Frontend nu primește date de la API
**Verificare:**
```bash
# Test direct pe server
curl http://localhost:3001/api/bookings?start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z | jq length

# Test prin nginx
curl https://view-calendar-theyouth.rotineret.ro/api/bookings?start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z | jq length
```

**Cauze posibile:**
- Nginx nu face proxy corect → verifică `/etc/nginx/sites-available/view_calendar`
- Backend nu rulează → `pm2 list`
- CORS issues → verifică logs

### 4. Detalii rezervări nu se potrivesc cu evenimentele
**Cauză:** Room ID-urile din `roomsConfig.ts` nu se potrivesc cu `serviceLocation.locationUri` din Bookings.

**Verificare:**
```bash
# Vezi ce location URI-uri returnează Microsoft Bookings
curl -s "https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/RezervaresliTheYouth@rotineret.ro/calendarView?start=2026-01-23T00:00:00Z&end=2026-01-24T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN" | jq '.value[] | .serviceLocation'
```

**Soluție:** Actualizează `src/services/roomsConfig.ts` cu ID-urile corecte (format: `NumeSala@rotineret.ro`).

---

## Nginx Configuration

```nginx
# /etc/nginx/sites-available/view_calendar
server {
    server_name view-calendar-theyouth.rotineret.ro;

    root /var/www/view_calendar_theYouth/dist;
    index index.html;

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/view-calendar-theyouth.rotineret.ro/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/view-calendar-theyouth.rotineret.ro/privkey.pem;
}
```

După modificări: `nginx -t && systemctl reload nginx`

---

## Flow-ul Datelor

1. **Backend sync (la fiecare 5 minute):**
   - `syncService.js` → Microsoft Graph API → SQLite

2. **Frontend request:**
   - `useCalendarEvents.ts` → IndexedDB (prioritar) → Server API (fallback)
   - Calendar events: Microsoft Graph Calendar API (room calendars)
   - Booking details: IndexedDB sau `/api/bookings`

3. **Matching (enrichment):**
   - `enrichEventsWithBookingData()` în `useCalendarEvents.ts`
   - Potrivește booking cu event după: room URI + same day + time overlap

---

## Room IDs (Microsoft Bookings)

| Sală | Room ID |
|------|---------|
| 3space | 3space@rotineret.ro |
| Yard | Yard@rotineret.ro |
| Kitchen | Kitchen@rotineret.ro |
| The DIY | TheDIY@rotineret.ro |
| The Youth Broadcast | TheYouthBroadcast@rotineret.ro |
| The Digital Makerspace | TheDigitalMakerspace@rotineret.ro |
| The Art Lab | TheArtLab@rotineret.ro |
| The Way | TheWay@rotineret.ro |
| The Team | TheTeam@rotineret.ro |
| The Nest | TheNest@rotineret.ro |
| The Link | TheLink@rotineret.ro |
| The Boost | TheBoost@rotineret.ro |
| The Action | TheAction@rotineret.ro |
| The Agora | TheAgora@rotineret.ro |

---

## Checklist Deploy Nou

- [ ] `git pull origin main`
- [ ] `npm run build`
- [ ] Verifică nginx config: `nginx -t`
- [ ] Restart backend cu env vars: `pm2 restart youth-calendar-backend`
- [ ] Verifică logs: `pm2 logs youth-calendar-backend --lines 20`
- [ ] Test API: `curl http://localhost:3001/api/health`
- [ ] Test bookings: `curl "http://localhost:3001/api/bookings?start=...&end=..." | jq length`
- [ ] Test în browser: refresh + verifică Debug Panel
