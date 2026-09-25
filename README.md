# AgroBill — Enterprise Hotel Contract Billing & Invoice Management System

AgroBill is a full-stack, production-grade enterprise web application built for bulk agricultural produce and grocery suppliers servicing commercial hotel contracts.

---

## 🌟 Key Features

1. **Authentication & Role-Based Access Control (RBAC)**
   - Roles: `Controller` (Owner/Admin) and `Employee`.
   - Public employee access request system (`/request-access`).
   - Secure approval workflow: Controllers approve access requests via Cloud Functions with the Firebase Admin SDK.
   - Deactivation, reactivation, and audit trails for all user management actions.

2. **Hotel Profile Management**
   - Manage hotel accounts with full Indian tax compliance: GSTIN, PAN, and 14-digit FSSAI licenses.
   - High-resolution logo upload to Firebase Storage with strict validation (JPEG, PNG, WebP, SVG up to 5MB).
   - Address, contact person, phone, and email records.

3. **Product Catalog**
   - Product master with categorizations (Vegetables, Fruits, Herbs, Spices, Dairy, Grocery, Other).
   - Weight units (`kg`, `g`) and count units (`box`, `piece`, `bundle`, `packet`, `dozen`).
   - Active/inactive status toggle and search filtering.

4. **Hotel-Specific Contract Pricing**
   - 6-month or 12-month fixed-price contracts negotiated per hotel.
   - Automatic contract end-date calculation.
   - Active status with start and end date boundaries.
   - Contract renewal workflow preserving historical rate integrity.

5. **Delivery-Date-Based Billing Workflow**
   - Active contract is dynamically resolved using the **Selected Delivery Date** (`startDate <= deliveryDate <= endDate AND status == 'active'`).
   - Canonical integer gram quantities for weight-based produce to eliminate floating-point imprecision.
   - Monetary values stored strictly as integer paise.
   - Financial calculations executed with `decimal.js` using `ROUND_HALF_UP` bankers' rounding.
   - Managerial rate overrides with mandatory reason recording and audit logging.

6. **Draft Bills**
   - Save in-progress billing sessions as drafts.
   - Continue editing drafts across sessions with concurrency version tracking.

7. **Deferred Atomic Invoice Generation**
   - Invoice numbers are strictly generated only when the invoice is **finalized** (never during draft/preview).
   - Atomic Firestore transactions ensure sequential, gapless numbering: `{prefix}_{YY}{YY}_{counter}` (e.g. `IVA_2627_2001`).
   - Immutable snapshot storage: Supplier info, hotel details, item names, agreed rates, tax, payment UPI, and terms are frozen into the finalized invoice.
   - Controller-only cancellation with mandatory justification.

8. **Dynamic High-Fidelity PDF Generation**
   - Styled invoice generation matching purple/lavender visual hierarchy.
   - AutoTable multi-page layout with repeating headers and page numbers.
   - Indian currency converter in words (crores, lakhs, thousands, rupees, and paise).
   - UPI QR code and payment instructions.

9. **Security & Audit Trail**
   - Append-only audit logs for all security and business events.
   - Comprehensive Firestore security rules enforcing RBAC and invoice immutability.
   - Cloud Functions for privileged user provisioning.
   - Global hosting via Firebase CDN with security headers and custom domain support.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, CoreUI React, Bootstrap 5, React Router v6
- **Backend & Cloud**: Firebase Authentication, Cloud Firestore, Cloud Storage, Firebase Cloud Functions (v2), Firebase Hosting
- **Math & Utilities**: `decimal.js`, `date-fns`, `jspdf`, `jspdf-autotable`
- **Testing**: Vitest, React Testing Library, jsdom

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ LTS recommended)
- Firebase CLI (`npm install -g firebase-tools`)

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Jeshwar23/agrobill.git
   cd agrobill
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env.local` and populate your Firebase project credentials:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Run Tests**:
   ```bash
   npx vitest run
   ```

---

## 🌐 Production Deployment (Firebase)

### 1. Build the Frontend
```bash
npm run build
```

### 2. Deploy Cloud Functions & Security Rules
```bash
# Login to Firebase
firebase login

# Set your active project
firebase use <your-project-id>

# Deploy Firestore Security Rules & Indexes
firebase deploy --only firestore

# Deploy Storage Security Rules
firebase deploy --only storage

# Deploy Cloud Functions
firebase deploy --only functions
```

### 3. Deploy Frontend to Firebase Hosting
```bash
firebase deploy --only hosting
```

### 4. Custom Domain Setup
In the [Firebase Console](https://console.firebase.google.com/):
1. Go to **Hosting** -> **Add Custom Domain**.
2. Enter your domain (e.g. `billing.yourdomain.com`).
3. Add the provided `A` or `CNAME` records in your DNS provider. SSL certificates are provisioned automatically.

---

## 📄 License
MIT License.
