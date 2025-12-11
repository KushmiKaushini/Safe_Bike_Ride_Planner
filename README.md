# Safe Bike Ride Planner 🚴‍♂️

A comprehensive web application that provides cyclists with real-time safety assessments based on weather conditions and air quality data.

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Features

- **🎯 Real-Time Safety Scoring** - Intelligent algorithm evaluates weather and air quality (0-100 score)
- **📍 Smart Location Detection** - Automatic IP-based location or manual city input
- **🔐 Secure Authentication** - Google OAuth 2.0 integration
- **📊 History Tracking** - Save and review past safety assessments
- **📈 Statistics Dashboard** - View cycling patterns and trends
- **🎨 Premium UI** - Modern, responsive design with smooth animations
- **⚡ Fast & Secure** - Backend API proxy protects API keys
- **📱 Mobile Responsive** - Optimized for all devices

---

## 🚀 Quick Start

### Prerequisites

- Node.js v14+ and npm v6+
- MongoDB Atlas account (free tier)
- API keys (see [Setup Guide](SETUP.md))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/KushmiKaushini/safe-bike-ride-planner.git
cd safe-bike-ride-planner

# 2. Install dependencies
cd backend
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Start the server
npm start

# 5. Open browser
# Visit: http://localhost:3000
```

**For detailed setup instructions, see [SETUP.md](SETUP.md)**

---

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Complete installation guide with prerequisites
- **[SYNC.md](SYNC.md)** - Quick sync guide for development
- **API Documentation** - See inline code documentation

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   Client (Browser)              │
│   HTML5 + CSS3 + Vanilla JS     │
└────────────┬────────────────────┘
             │ REST API
┌────────────▼────────────────────┐
│   Backend (Node.js + Express)   │
│   - API Routes                  │
│   - OAuth Authentication        │
│   - External API Proxy          │
└────────────┬────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐
│MongoDB │      │External  │
│Atlas   │      │APIs      │
└────────┘      └──────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox/Grid
- **Vanilla JavaScript (ES6+)** - No frameworks, pure JS

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Mongoose** - MongoDB ODM
- **Passport.js** - Authentication middleware

### Database
- **MongoDB Atlas** - Cloud NoSQL database

### External APIs
- **OpenWeatherMap** - Weather data
- **IP Geolocation** - Location detection
- **OpenAQ** - Air quality data

---

## 📊 Safety Score Algorithm

The safety score (0-100) is calculated using a weighted algorithm:

- **Weather Score (40%)**
  - Temperature: Optimal 15-25°C
  - Wind Speed: Safe < 8 m/s
  - Precipitation: None preferred
  - Humidity: Comfortable 40-70%

- **Air Quality Score (40%)**
  - AQI 0-50: Excellent
  - AQI 51-100: Good
  - AQI 101-150: Moderate
  - AQI 151+: Unhealthy

- **Condition Score (20%)**
  - Clear/Sunny: Best
  - Cloudy: Good
  - Rain: Caution
  - Storm: Unsafe

**Safety Levels:**
- 🟢 **Safe** (70-100): Great conditions for cycling
- 🟡 **Caution** (40-69): Exercise caution
- 🔴 **Unsafe** (0-39): Consider postponing

---

## 🔐 Security Features

- ✅ OAuth 2.0 authentication (Google)
- ✅ Backend API proxy (protects API keys)
- ✅ Session management with HTTP-only cookies
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Input validation with Mongoose schemas
- ✅ Environment variable protection

---

## 📁 Project Structure

```
Safe_Bike_Ride_Planner/
├── backend/                 # Backend server
│   ├── config/             # Configuration files
│   ├── middleware/         # Custom middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── .env.example        # Environment template
│   ├── server.js           # Main server file
│   └── package.json        # Dependencies
├── public/                 # Frontend files
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── index.html         # Main HTML
├── start.bat              # Windows startup script
├── start.sh               # Mac/Linux startup script
├── README.md              # This file
├── SETUP.md               # Setup guide
└── SYNC.md                # Quick sync guide
```

---

## 🧪 Testing

### Manual Testing
```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Test weather API
curl "http://localhost:3000/api/external/weather?lat=1.3521&lon=103.8198"

# 3. Check database
mongosh "YOUR_MONGODB_URI"
use safe-bike-planner
show collections
```

### Browser Testing
1. Open http://localhost:3000
2. Test location detection
3. Generate safety report
4. Test Google login
5. Save and view history

---

## 🚢 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

### Deployment Platforms

- **Heroku** - Easy deployment with CLI
- **Vercel** - Great for full-stack apps
- **DigitalOcean** - More control with droplets
- **AWS/Azure** - Enterprise-grade hosting

See [SETUP.md](SETUP.md#-deployment) for detailed deployment instructions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenWeatherMap** - Weather data API
- **OpenAQ** - Air quality data
- **MongoDB Atlas** - Cloud database hosting
- **Google Cloud** - OAuth authentication
- **Express.js** - Web framework
- **Passport.js** - Authentication middleware

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/KushmiKaushini/safe-bike-ride-planner/issues)
- **Documentation**: See [SETUP.md](SETUP.md) for detailed setup instructions
- **Email**: 163408015+KushmiKaushini@users.noreply.github.com

---

## 🎯 Roadmap

- [ ] Route planning with elevation data
- [ ] Real-time weather alerts
- [ ] Social features (share rides)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with fitness trackers
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

---

## 📸 Screenshots

### Landing Page
![Landing Page](docs/screenshots/landing.png)

### Safety Report
![Safety Report](docs/screenshots/report.png)

### History Dashboard
![History](docs/screenshots/history.png)

---

**Built with ❤️ for cyclists everywhere**

**Last Updated**: December 2024
