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

## 📄 License
MIT License.
