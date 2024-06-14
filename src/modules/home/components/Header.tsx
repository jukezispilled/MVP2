const Header = () => {
  return (
    <h1
      className="text-center text-6xl font-black lg:text-extra"
      style={{
        backgroundImage: "url('/bg1.png')",
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
        color: "transparent",
      }}
    >
      MVP
    </h1>
  );
};

export default Header;
