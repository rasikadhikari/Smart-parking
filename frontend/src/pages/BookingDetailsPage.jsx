import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { QRCodeSVG } from "qrcode.react";
import ShiftingCountdown from "../components/ui/ShiftingCountdown.tsx";

const BookingDetailsPage = ({ user }) => {
  const [booking, setBooking] = useState(null);
  const [parkingSpace, setParkingSpace] = useState(null);
  const [error, setError] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login", {
        state: { message: "Please log in to view booking details." },
      });
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await api.get(`/bookings/${id}`);
        console.log(response.data);
        setBooking(response.data);

        if (response.data.parkingSpaceId) {
          const psRes = await api.get(
            `/parking-spaces/${response.data.parkingSpaceId}`
          );
          setParkingSpace(psRes.data);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Error fetching booking details"
        );
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login", {
            state: { message: "Session expired. Please log in again." },
          });
        }
      }
    };

    fetchBooking();
  }, [id, user, navigate]);

  const handleDownloadPDF = async () => {
    try {
      setError("");
      const response = await api.get(`/bookings/${id}`, {
        responseType: "blob",
        headers: { Accept: "application/pdf" },
      });

      if (response.headers["content-type"] === "application/pdf") {
        const url = window.URL.createObjectURL(
          new Blob([response.data], { type: "application/pdf" })
        );
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `booking-${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          setError(json.message || "Error downloading PDF");
        } catch {
          setError("Unexpected response from server");
        }
      }
    } catch (err) {
      console.error("PDF download error:", err);
      setError(
        err.response?.data?.message || err.message || "Error downloading PDF"
      );
    }
  };

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-white px-8 py-6 rounded-xl shadow-card text-center text-gray-600">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            "Loading booking details..."
          )}
        </div>
      </div>
    );
  }

  const qrCodeValue = `booking:${booking._id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center px-4 py-8">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-card p-8 grid md:grid-cols-2 gap-6">
        {/* Booking Info */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-blue-700 text-center md:text-left">
            Booking Information
          </h2>
          <hr className="border-gray-300" />
          <p>
            <span className="font-medium">Booking Name:</span>{" "}
            {parkingSpace?.name || "Parking Reservation"}
          </p>
          <p>
            <span className="font-medium">Booking ID:</span> {booking._id}
          </p>
          <p>
            <span className="font-medium">Guest:</span>{" "}
            {booking.guestName || "Registered User"}
          </p>
          <p>
            <span className="font-medium">Slot Number:</span>{" "}
            {booking.slotId?.slotNumber || "N/A"}
          </p>
          <p>
            <span className="font-medium">Vehicle Number:</span>{" "}
            {booking.vehicleNumber}
          </p>
          <p>
            <span className="font-medium">Vehicle Type:</span>{" "}
            {booking.vehicleType}
          </p>
          <p>
            <span className="font-medium">Start Time:</span>{" "}
            {new Date(booking.startTime).toLocaleString()}
          </p>
          <p>
            <span className="font-medium">End Time:</span>{" "}
            {new Date(booking.endTime).toLocaleString()}
          </p>
          <p>
            <span className="font-medium">Duration:</span> {booking.duration}{" "}
            mins
          </p>
          <p>
            <span className="font-medium">Paid:</span> NPR{" "}
            {(booking.amount || booking.duration * 10).toFixed(2)}
          </p>
          <div>
            <span className="font-medium">Remaining:</span>
            <div className="mt-2">
              {new Date(booking.endTime) <= new Date() ? (
                <p className="text-red-600">Booking has ended</p>
              ) : (
                <ShiftingCountdown endTime={booking.endTime} />
              )}
            </div>
          </div>
          <p>
            <span className="font-medium">Status:</span> {booking.paymentStatus}
          </p>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-between">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Your QR Ticket
            </h3>
            <QRCodeSVG
              value={qrCodeValue}
              size={180}
              className="border-2 border-gray-300 p-3 rounded-xl bg-white shadow-sm"
              level="H"
            />
          </div>

          <div className="w-full mt-6 space-y-3">
            <button
              onClick={handleDownloadPDF}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition"
            >
              Download PDF
            </button>
            <button
              onClick={() => navigate("/AllBookings")}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition"
            >
              Back to All Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsPage;
