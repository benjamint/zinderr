# Zinderr - Ghana's Trusted Errand Platform

A modern web application that connects people who need help with errands (posters) and those willing to help (runners) in Ghana. Built with React, TypeScript, Supabase, and Tailwind CSS.

## 🚀 Features

### For Posters (People who need help)
- **Post Errands**: Create detailed errand requests with descriptions, locations, and payment amounts
- **Track Progress**: Monitor the status of your posted errands (open, in progress, completed, cancelled)
- **Review Bids**: View and accept bids from verified runners
- **Rate Runners**: Provide feedback and ratings after completed tasks
- **Manage History**: View all your past errands and transactions

### For Runners (People who help)
- **Browse Errands**: Search and filter available errands by location and amount
- **Place Bids**: Submit competitive bids with messages
- **Track Earnings**: Monitor wallet balance and completed tasks
- **Verification System**: Complete identity verification for trust and safety
- **Manage Tasks**: View assigned tasks and update their status

### Core Features
- **User Authentication**: Secure sign-up/sign-in with email and password
- **User Types**: Separate interfaces for posters and runners
- **Real-time Updates**: Live status updates and notifications
- **Rating System**: Mutual rating system for both posters and runners
- **Wallet System**: Track earnings and payments
- **Location-based**: Ghana-specific address input and location tracking
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful, customizable icons

### Backend & Database
- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **Row Level Security (RLS)** - Secure data access policies
- **Real-time subscriptions** - Live updates and notifications
- **File Storage** - Image uploads and document storage

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **TypeScript ESLint** - TypeScript-specific linting rules

## 📁 Project Structure

```
Zinderr/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── common/         # Shared components
│   │   ├── dashboard/      # Main dashboard components
│   │   ├── history/        # Transaction history
│   │   ├── profile/        # User profile management
│   │   └── wallet/         # Wallet and payment components
│   ├── contexts/           # React context providers
│   ├── lib/               # Utility functions and configurations
│   └── main.tsx           # Application entry point
├── supabase/
│   └── migrations/        # Database schema migrations
├── public/                # Static assets
└── package.json           # Dependencies and scripts
```

## 🗄️ Database Schema

### Core Tables

#### `profiles`
- User profiles with authentication and verification data
- User types: `poster` or `runner`
- Verification status for runners
- Rating and task completion tracking
- Wallet balance for runners

#### `errands`
- Errand requests posted by users
- Status tracking: `open`, `in_progress`, `completed`, `cancelled`
- Location and payment information
- Image attachments and notes

#### `bids`
- Runner bids on errands
- Bid amounts and messages
- Status: `pending`, `accepted`, `rejected`

#### `transactions`
- Completed errand payments
- Payment tracking and dispute resolution

#### `mutual_ratings`
- Rating system between posters and runners
- Comments and feedback

#### `wallets`
- Runner earnings and balance tracking
- Withdrawal history

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Zinderr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations in `supabase/migrations/`
   - Configure Row Level Security policies
   - Set up storage buckets for file uploads

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔐 Security Features

### Authentication
- Email/password authentication via Supabase Auth
- Session management and persistence
- Secure logout functionality

### Data Protection
- Row Level Security (RLS) policies
- User-specific data access controls
- Input validation and sanitization

### Runner Verification
- Ghana ID card verification
- Selfie verification
- Admin approval process
- Verification status tracking

## 🎨 UI/UX Features

### Design System
- **Color Scheme**: Blue and purple gradient theme
- **Typography**: Clean, readable fonts
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first design approach

### User Experience
- **Loading States**: Smooth loading animations
- **Error Handling**: User-friendly error messages
- **Form Validation**: Real-time input validation
- **Modal Dialogs**: Contextual information display
- **Search & Filter**: Advanced errand discovery

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Touch interactions

## 🔄 Real-time Features

- Live errand status updates
- Real-time bid notifications
- Instant wallet balance updates
- Live chat capabilities (planned)

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Vercel**: Zero-config deployment
- **Netlify**: Static site hosting
- **Supabase**: Full-stack hosting
- **AWS S3 + CloudFront**: Static hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

### Planned Features
- **Push Notifications**: Real-time mobile notifications
- **Payment Integration**: Mobile money and card payments
- **Advanced Search**: Location-based errand discovery
- **Chat System**: In-app messaging between users
- **Analytics Dashboard**: User activity and performance metrics
- **API Documentation**: Comprehensive API reference

### Technical Improvements
- **Performance Optimization**: Code splitting and lazy loading
- **Testing**: Unit and integration tests
- **CI/CD**: Automated testing and deployment
- **Monitoring**: Error tracking and performance monitoring

---

**Built with ❤️ for Ghana's community**
