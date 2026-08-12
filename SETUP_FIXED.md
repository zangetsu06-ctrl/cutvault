# Cut Vault - fixed local setup

1. Import `cutvault_database.sql` in phpMyAdmin.
2. Put the `api` folder under `C:\xampp\htdocs\cutvault\api`.
3. Start Apache and MySQL in XAMPP.
4. Run `http://localhost/cutvault/api/seed.php` once to create/reset the admin:
   - username: `admin`
   - password: `admin123`
5. In `client`, run `npm install`, then `npm run dev`.
6. Open `http://localhost:5173`.

The React client now calls the PHP API at `http://localhost/cutvault/api/`.
