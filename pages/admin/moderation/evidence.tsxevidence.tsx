// middleware or getServerSideProps
if (!user || user.role !== 'admin') {
  return { notFound: true };
}
