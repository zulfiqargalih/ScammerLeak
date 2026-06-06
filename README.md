# ScammerLeak

## Description
ScammerLeak is a web application that allows users to report and view information about online scams. It provides a simple interface for submitting scam reports, browsing reported cases, and managing reports for administrators.

## Features
- Submit scam reports with details such as title, description, and evidence.
- View a list of reported scams with filtering options.
- Administrator dashboard for reviewing and managing reports.
- Real‑time updates powered by Firebase and Supabase.

## Tech Stack
- **Framework:** Next.js (React, TypeScript)
- **Styling:** Tailwind CSS
- **Database & Authentication:** Firebase (Firestore) and Supabase
- **Deployment:** Vercel (or any Node.js compatible platform)

## Getting Started

### Prerequisites
* Node.js (v18 or later)
* npm or yarn
* A Firebase project with Firestore enabled
* A Supabase project for authentication (optional)

### Installation
```bash
git clone https://github.com/yourusername/scammerleak.git
cd scammerleak
npm install
```

### Configuration
1. Copy the example environment file:
	```bash
	cp .env.example .env.local
	```
2. Fill in the required Firebase and Supabase credentials in `.env.local`.

### Running the Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser to view the application.

## Usage
* **Public Users:** Can browse reported scams and submit new reports via the form on the website.
* **Administrators:** Access the admin panel at `/admin` to review, approve, or delete reports.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes and push to your fork.
4. Open a pull request describing the changes.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
