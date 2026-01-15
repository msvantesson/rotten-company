useEffect(() => {
  let mounted = true;

  async function checkAuth() {
    try {
      // 1) Ask the server for the authenticated user (reads HttpOnly cookies)
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!mounted) return;

      if (res.ok) {
        const payload = await res.json();
        if (payload?.user) {
          setUserPresent(true);
          setCheckingAuth(false);
          return;
        }
      }

      // 2) Fallback: try client-side session (useful for non-HttpOnly setups)
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      if (sessionData?.session?.user) {
        setUserPresent(true);
        setCheckingAuth(false);
        return;
      }

      // 3) No user found — small delay to avoid racing with auth init, then redirect
      await new Promise((r) => setTimeout(r, 250));
      if (!mounted) return;

      const { data: finalSession } = await supabase.auth.getSession();
      if (finalSession?.session?.user) {
        setUserPresent(true);
        setCheckingAuth(false);
        return;
      }

      setUserPresent(false);
      setCheckingAuth(false);
      router.push("/login");
    } catch (err) {
      console.error("Auth check failed:", err);
      if (mounted) {
        setUserPresent(false);
        setCheckingAuth(false);
        router.push("/login");
      }
    }
  }

  checkAuth();

  // Keep UI in sync with client auth changes
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!mounted) return;
    if (session?.user) {
      setUserPresent(true);
      setCheckingAuth(false);
    } else {
      setUserPresent(false);
    }
  });

  return () => {
    mounted = false;
    listener?.subscription?.unsubscribe?.();
  };
}, [router]);
