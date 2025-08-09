import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import Header from '../components/Header';
import Notification from '../components/Notification';
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
        <ShoppingList hideOnPurchase={true} showDeleteButton={false} showMarkUnpurchased={false} />
      </main>
      <Notification />
    </div>
  );
}

export default ShoppingPage;
