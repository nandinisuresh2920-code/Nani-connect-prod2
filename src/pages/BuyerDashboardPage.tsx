import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabaseClient';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string; // Changed to image_url to match Supabase schema
  seller_id: string;
}

const ProductCard = ({ product, onAddToCart }: { product: Product; onAddToCart: (product: Product) => void }) => (
  <Card className="flex flex-col">
    {product.image_url && (
      <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
    )}
    <CardHeader>
      <CardTitle className="text-xl">{product.name}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow flex flex-col justify-between">
      <p className="text-muted-foreground text-sm mb-2">{product.description}</p>
      <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-4 w-full">View Details</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-64 object-cover rounded-lg" />}
            <p className="text-muted-foreground">{product.description}</p>
            <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
            <Button className="w-full" onClick={() => onAddToCart(product)}>Add to Cart</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CardContent>
  </Card>
);

const BuyerDashboardPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setProductsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*');

    if (error) {
      showError(error.message);
    } else {
      setProducts(data as Product[]);
    }
    setProductsLoading(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => [...prev, product]);
    showSuccess(`${product.name} added to cart!`);
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + item.price, 0).toFixed(2);
  };

  if (authLoading || productsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.user_metadata?.role !== 'buyer') {
    navigate('/login'); // Redirect if not logged in or not a buyer
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-5xl mb-6">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Buyer Dashboard, {user.email}!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-center text-muted-foreground">
            Explore products and manage your cart.
          </p>
          <div className="flex justify-center">
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold mb-4">Available Products</h2>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground">No products available yet. Check back later!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                  ))}
                </div>
              )}
            </div>

            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-2xl">Your Cart</CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground">Your cart is empty.</p>
                ) : (
                  <>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4 mb-4">
                      {cart.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2">
                          <span>{item.name}</span>
                          <span>${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </ScrollArea>
                    <Separator className="my-4" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>${calculateCartTotal()}</span>
                    </div>
                    <Button className="w-full mt-4">Proceed to Checkout</Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default BuyerDashboardPage;