const Footer = () => {
  return (
    <footer className="bg-[#2563EB] text-white py-6 mt-10 z-50">
      <div className="text-center text-sm">
        &copy; {new Date().getFullYear()} Smart Parking. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
