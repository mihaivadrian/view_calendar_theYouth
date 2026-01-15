# The Youth Calendar - Configurare Azure AD

## Ce trebuie să faci pentru ca TOȚI utilizatorii să vadă calendarele sălilor

Problema actuală: doar tu (admin) poți vedea calendarele. Soluția este să dai permisiune de citire tuturor utilizatorilor din organizație pe calendarele sălilor.

### Soluția simplă - Exchange Online PowerShell

**Pasul 1**: Instalează modulul Exchange Online (o singură dată)
```powershell
Install-Module -Name ExchangeOnlineManagement
```

**Pasul 2**: Conectează-te și rulează comanda
```powershell
# Conectare
Connect-ExchangeOnline -UserPrincipalName mihai.vilcea@rotineret.ro

# Dă acces tuturor utilizatorilor la toate sălile
$rooms = Get-Mailbox -RecipientTypeDetails RoomMailbox
foreach ($room in $rooms) {
    Set-MailboxFolderPermission -Identity "$($room.PrimarySmtpAddress):\Calendar" -User Default -AccessRights Reviewer
    Write-Host "✓ Configurat: $($room.DisplayName)"
}

# Deconectare
Disconnect-ExchangeOnline -Confirm:$false
```

**Gata!** Acum oricine se loghează în aplicație va putea vedea calendarele sălilor.

---

## Configurare inițială Azure AD (deja făcută)

### 1. App Registration
- **Name**: `The Youth Calendar`
- **Supported account types**: Single tenant
- **Redirect URI**: SPA - `http://localhost:5173`

### 2. API Permissions (Delegated)
- `User.Read` - Citește profilul utilizatorului
- `Calendars.Read` - Citește calendarele
- `Calendars.Read.Shared` - Citește calendarele partajate
- `Place.Read.All` - Citește lista de săli

### 3. Grant admin consent
Click pe "Grant admin consent for [Organizație]"

### 4. Variabile de mediu (.env)
```env
VITE_AZURE_CLIENT_ID=1c4f8b66-2145-46f9-a0c1-e30bcad818d0
VITE_AZURE_TENANT_ID=670526f9-b5e7-462f-a429-c91d5e2a14c6
VITE_REDIRECT_URI=http://localhost:5173
```

---

## Troubleshooting

### "Access Denied" la citirea calendarelor
Rulează din nou scriptul PowerShell de mai sus.

### Utilizatorul nu vede sălile
Verifică că ai dat "Grant admin consent" în Azure AD.
