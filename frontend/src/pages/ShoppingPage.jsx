import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import Header from '../components/Header';
import ShoppingList from '../components/ShoppingList';

function ShoppingPage() {
  const navigate = useNavigate();

  const goBack = () => {
    navigate('/');
  };

  return (
    <div className="App" dir="rtl">
      <Header />
      <main className="container">
        <div className="back-link">
          <button onClick={goBack} className="btn back-btn">
            <FaArrowRight /> חזרה לעריכת רשימה
          </button>
        </div>

        <ShoppingList hideOnPurchase={true} showDeleteButton={false} />
      </main>
    </div>
  );
}

export default ShoppingPage;
