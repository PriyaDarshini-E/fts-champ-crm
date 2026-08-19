export const isAuthRoute = (path) => {
    return ["/", "/forgot-password", "/signup", "/maintenance", "/registerform"].includes(path);
  };