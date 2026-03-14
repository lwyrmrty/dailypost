'use client';

import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function LinkedInLoginButton() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const linkedinConnected = searchParams.get('linkedin') === 'connected';

  async function handleLinkedInSignIn() {
    setLoading(true);
    await signIn('linkedin', { callbackUrl: '/dashboard' });
  }

  return (
    <div className={styles.loginForm}>
      <div>
        <div className={styles.loginHeader}>
          Continue with
          <br />
          LinkedIn
        </div>
        <div className={styles.linkedinButton}>
          <button
            type="button"
            onClick={handleLinkedInSignIn}
            disabled={loading}
            className={styles.linkedinCta}
          >
            {loading ? 'Redirecting to LinkedIn...' : 'Continue with LinkedIn'}
          </button>
        </div>
      </div>

      {linkedinConnected && (
        <div className={styles.successMessage}>
          LinkedIn reconnected successfully.
        </div>
      )}

      {authError && (
        <div className={styles.errorMessage}>
          LinkedIn sign-in failed. Please try again.
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.adminWrapper}>
        <div className={styles.loginContent}>
          <div className={styles.loginBlock}>
            <div className={styles.loginFormWrapper}>
              <img
                loading="lazy"
                src="/webflow-assets/images/postieslogofinallite.svg"
                alt="Posties"
                className={styles.loginLogo}
              />

              <Suspense fallback={<div className={styles.loadingState}>Loading...</div>}>
                <LinkedInLoginButton />
              </Suspense>

              <p className={styles.helperText}>
                Your LinkedIn account is used for both sign-in and publishing access.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.loginImageSide}>
          <div className={styles.loginImage}>
            <img
              loading="lazy"
              src="https://cdn.prod.website-files.com/69af8998456ec24b29704c58/69b43398b0f22cc7e5fc0043_thinkingcreative.webp"
              alt=""
              className={styles.fullImage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
