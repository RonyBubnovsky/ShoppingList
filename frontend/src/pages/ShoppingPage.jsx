import Header from '../components/Header';
import Notification from '../components/Notification';
import ShoppingList from '../components/ShoppingList';

function ShoppingPage() {
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
