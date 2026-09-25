import * as admin from 'firebase-admin';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

/**
 * Cloud Function triggered when an access request is updated.
 * When status changes to 'approved', securely creates the user in Firebase Auth
 * using Firebase Admin SDK, assigns custom claims and creates the user profile in Firestore.
 */
export const onAccessRequestApproved = onDocumentUpdated(
  'accessRequests/{requestId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    // Check if status transitioned to approved
    if (beforeData.status !== 'approved' && afterData.status === 'approved') {
      const email = afterData.email.toLowerCase().trim();
      const displayName = afterData.name.trim();

      try {
        let userRecord: admin.auth.UserRecord;

        try {
          userRecord = await auth.getUserByEmail(email);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            // Generate random temporary password; user will reset via password reset link
            const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
            userRecord = await auth.createUser({
              email,
              displayName,
              password: tempPassword,
              emailVerified: true,
            });
          } else {
            throw error;
          }
        }

        // Set custom user claims for RBAC
        await auth.setCustomUserClaims(userRecord.uid, {
          role: 'employee',
        });

        // Create or update user profile document in Firestore
        await db.collection('users').doc(userRecord.uid).set(
          {
            uid: userRecord.uid,
            name: displayName,
            email,
            role: 'employee',
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: null,
          },
          { merge: true }
        );

        // Generate password reset link so the employee can set their password
        const resetLink = await auth.generatePasswordResetLink(email);
        console.log(`User created for ${email}. Password reset link generated: ${resetLink}`);

        // Update the access request with user ID
        await event.data?.after.ref.update({
          createdUid: userRecord.uid,
          inviteSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`Failed to provision user for approved request ${event.params.requestId}:`, err);
        throw err;
      }
    }
  }
);

/**
 * Secure HTTPS Callable Function to cancel a finalized invoice.
 * Enforces controller role verification on the server before mutating.
 */
export const cancelInvoiceCallable = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerUid = request.auth.uid;
  const userDoc = await db.collection('users').doc(callerUid).get();
  const userData = userDoc.data();

  if (!userData || userData.role !== 'controller') {
    throw new HttpsError('permission-denied', 'Only controllers can cancel invoices.');
  }

  const { invoiceId, reason } = request.data;
  if (!invoiceId || !reason || !reason.trim()) {
    throw new HttpsError('invalid-argument', 'Invoice ID and cancellation reason are required.');
  }

  const invoiceRef = db.collection('invoices').doc(invoiceId);
  const invoiceSnap = await invoiceRef.get();

  if (!invoiceSnap.exists) {
    throw new HttpsError('not-found', 'Invoice does not exist.');
  }

  const invoiceData = invoiceSnap.data();
  if (invoiceData?.status !== 'finalized') {
    throw new HttpsError('failed-precondition', 'Only finalized invoices can be cancelled.');
  }

  // Update status atomically
  await invoiceRef.update({
    status: 'cancelled',
    cancellationReason: reason.trim(),
    cancelledBy: callerUid,
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    previousStatus: invoiceData.status,
  });

  // Record audit log
  await db.collection('auditLogs').add({
    action: 'invoice_cancelled',
    entityType: 'invoice',
    entityId: invoiceId,
    performedBy: callerUid,
    performedByName: userData.name || 'Controller',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      invoiceNumber: invoiceData.invoiceNumber,
      reason: reason.trim(),
    },
  });

  return { success: true, message: 'Invoice cancelled successfully.' };
});
