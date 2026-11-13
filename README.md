# Staywell hotel booking

MERN hotel booking app with five CRUD resources: users, hotels, rooms, bookings, and reviews.

## Run locally

1. Start a local MongoDB server. The backend defaults to `mongodb://127.0.0.1:27017/hotel_booking_db`.
2. Copy `backend/.env.example` to `backend/.env` and set `JWT_SECRET` to a random value of at least 32 characters.
3. Install and start the API:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

4. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

5. To create the first administrator, add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 8 characters) to `backend/.env`, then run `npm run create-admin` from `backend`. Registration intentionally allows only the `user` and `owner` roles.
6. Add the preconfigured properties and PKR room rates with `npm run seed:demo` from `backend`. The seeder requires one existing owner/admin; if several exist, set `DEMO_DATA_OWNER_EMAIL` to select one. Alternatively, set `DEMO_OWNER_NAME`, `DEMO_OWNER_EMAIL`, and `DEMO_OWNER_PASSWORD` to provision a dedicated owner account—there are no default demo credentials. The seeder is safe to run again and does not change account roles.

The browser app runs at `http://localhost:5173`; the API runs at `http://localhost:5000/api`. In development, the API client follows the browser hostname so authentication cookies work consistently on both `localhost` and `127.0.0.1`. Set `VITE_API_URL` in the frontend environment to override the API URL for deployment. The API uses an HTTP-only JWT cookie, with credentialed CORS configured by `CLIENT_URL`.

The inventory references real hotel names in Islamabad, Lahore, Karachi, Murree, Hunza, and Skardu. Seeded listing rates and availability are illustrative PKR values, and destination photos are not presented as hotel photography. A booking in the app does not reserve a room at the named real-world property. Do not present seeded listings as live offers. The homepage displays reviews only after a guest submits one for a completed booking.

### Destination and property photos

Destination cards use resized landmark-photo copies from Wikimedia Commons. Each credit links to the source file and CC BY-SA 4.0 license and names the photographer; these images are distributed under the same license. They are destination imagery, not claims about a specific hotel's rooms or facilities. The app does not use Google Places or require a paid API key.

When creating a property, owners can add its first room, guest capacity, room numbers, nightly rate in PKR, and optional photos in one form. Additional room types and photos can be managed on the property card. Only upload images they own or are authorized to use. JPEG, PNG, and WebP files up to 5 MB each are accepted, with up to five photos per property. For this local academic app, files are stored under `backend/uploads/` and are excluded from Git. A deployed production service should use durable object storage and a CDN instead of local disk, which may be ephemeral or unavailable across multiple API instances.

## Owner and admin access

- **Owner:** Start the app, visit `http://localhost:5173/register?role=owner`, and create an owner account with your own email and password. You will be signed in and taken to `/owner`; later, use `/login` with that email and password.
- **Admin:** Public registration cannot create admins. Add `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 8 characters) to `backend/.env`, then run `npm run create-admin` from `backend`. Sign in at `http://localhost:5173/login` with the email/password you configured; admins are redirected to `/admin`. There are no built-in/default admin credentials.
- **Seeded properties:** After creating an owner or admin account, run `npm run seed:demo` from `backend`. With exactly one eligible account, the seeded hotels are assigned to it; if there are multiple owner/admin accounts, set `DEMO_DATA_OWNER_EMAIL` in `backend/.env` to select the account that should own them.

Run backend integration tests with MongoDB running using `npm test` from `backend`. They use the separate `hotel_booking_test` database by default; set `MONGO_TEST_URI` to override it.

## Resources and access

| Resource | Main API routes | Access |
|---|---|---|
| Users | `/api/auth/register`, `/api/auth/login`, `/api/users` | Public registration/login; users can manage their own profile; admins can manage all users |
| Hotels | `/api/hotels` | Browsing is public; owners manage their own listings; admins can manage any listing |
| Rooms | `/api/rooms` | Browsing is public; hotel owners manage their rooms |
| Bookings | `/api/bookings` | Authenticated guests book and manage their bookings; owners manage bookings for their properties; admins manage all |
| Reviews | `/api/reviews` | Public reading; authenticated guests with a completed booking can create a review; authors/admins can update or delete |

Rooms store unavailable nights as UTC calendar dates. Guests can enter any positive whole-number party size; bookings allocate enough available rooms based on each room's capacity, and the API calculates the combined price for the stay. The practical guest limit is the hotel's available capacity, not an application-wide guest-count cap. Clients cannot choose their own total. A user with the admin role must be provisioned with the `create-admin` script, not public registration.
