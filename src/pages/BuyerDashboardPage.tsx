import React, { useState, useEffect, useRef } from 'react';
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
import { Mic, Search, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  seller_id: string;
}

interface SellerProfile {
  id: string;
  role: 'buyer' | 'seller';
  latitude?: number;
  longitude?: number;
  email?: string; // Assuming we can fetch email from auth.users or join
}

// Haversine formula to calculate distance between two lat/lon points
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

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

const SellerCard = ({ seller }: { seller: SellerProfile }) => (
  <Card className="p-4 flex flex-col items-center text-center">
    <CardTitle className="text-lg">{seller.email || 'Unknown Seller'}</CardTitle>
    <p className="text-sm text-muted-foreground">Seller ID: {seller.id.substring(0, 8)}...</p>
    {seller.latitude && seller.longitude && (
      <Badge variant="secondary" className="mt-2">Location Available</Badge>
    )}
  </Card>
);

const BuyerDashboardPage = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [buyerLocation, setBuyerLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbySellers, setNearbySellers] = useState<SellerProfile[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [voiceSearchText, setVoiceSearchText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const KILOMETER_RADIUS = 2; // 2km radius

  useEffect(() => {
    if (user) {
      fetchBuyerLocationAndSellers();
      fetchAllProducts();
    }
  }, [user]);

  useEffect(() => {
    // Filter products whenever allProducts or voiceSearchText changes
    if (voiceSearchText) {
      setFilteredProducts(
        allProducts.filter(product =>
          product.name.toLowerCase().includes(voiceSearchText.toLowerCase()) ||
          product.description.toLowerCase().includes(voiceSearchText.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(allProducts);
    }
  }, [allProducts, voiceSearchText]);

  const fetchBuyerLocationAndSellers = async () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setBuyerLocation({ latitude, longitude });
          await fetchNearbySellers(latitude, longitude);
          setLocationLoading(false);
        },
        (error) => {
          showError(`Failed to get your location: ${error.message}. Location-based features will be limited.`);
          console.error("Geolocation error:", error);
          setLocationLoading(false);
          // Still try to fetch all sellers even if buyer location fails
          fetchNearbySellers(undefined, undefined);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      showError("Geolocation is not supported by your browser. Location-based features will not be available.");
      setLocationLoading(false);
      // Still try to fetch all sellers even if geolocation is not supported
      fetchNearbySellers(undefined, undefined);
    }
  };

  const fetchNearbySellers = async (buyerLat?: number, buyerLon?: number) => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, latitude, longitude')
      .eq('role', 'seller');

    if (profilesError) {
      showError(`Failed to fetch seller profiles: ${profilesError.message}`);
      return;
    }

    const { data: users, error: usersError } = await supabase
      .from('users') // Assuming 'users' table is accessible or joining auth.users
      .select('id, email');

    if (usersError) {
      console.warn("Could not fetch user emails for sellers:", usersError.message);
    }

    const sellerProfiles: SellerProfile[] = profiles.map(profile => {
      const userEmail = users?.find(u => u.id === profile.id)?.email;
      return { ...profile, email: userEmail };
    });

    if (buyerLat !== undefined && buyerLon !== undefined) {
      const filtered = sellerProfiles.filter(seller => {
        if (seller.latitude && seller.longitude) {
          const distance = haversineDistance(buyerLat, buyerLon, seller.latitude, seller.longitude);
          return distance <= KILOMETER_RADIUS;
        }
        return false;
      });
      setNearbySellers(filtered);
    } else {
      // If buyer location not available, show all sellers with location data
      setNearbySellers(sellerProfiles.filter(s => s.latitude && s.longitude));
    }
  };

  const fetchAllProducts = async () => {
    setProductsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*');

    if (error) {
      showError(error.message);
    } else {
      setAllProducts(data as Product[]);
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

  // Voice Search Logic
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) {
      showError("Voice search is not supported by your browser.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'ta-IN'; // Set language to Tamil (India)

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setVoiceSearchText(''); // Clear previous search text
      showSuccess("Listening for Tamil voice input...");
    };

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setVoiceSearchText(transcript);
      setIsListening(false);
      showSuccess(`Recognized: "${transcript}"`);
    };

    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      showError(`Voice search error: ${event.error}`);
      console.error("Speech recognition error:", event.error);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const clearVoiceSearch = () => {
    setVoiceSearchText('');
    stopVoiceSearch();
  };

  if (authLoading || productsLoading || locationLoading) {
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
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="Search products or use voice search..."
                    value={voiceSearchText}
                    onChange={(e) => setVoiceSearchText(e.target.value)}
                    className="pr-10"
                  />
                  {voiceSearchText && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={clearVoiceSearch}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                    onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                    title={isListening ? "Stop Voice Search" : "Start Voice Search (Tamil)"}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <p className="text-center text-muted-foreground">No products available yet or matching your search. Check back later!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Nearby Sellers (within {KILOMETER_RADIUS}km)</CardTitle>
                </CardHeader>
                <CardContent>
                  {nearbySellers.length === 0 ? (
                    <p className="text-muted-foreground">No sellers found nearby or location not available.</p>
                  ) : (
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      {nearbySellers.map((seller) => (
                        <div key={seller.id} className="mb-2">
                          <SellerCard seller={seller} />
                          <Separator className="my-2" />
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card>
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
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default BuyerDashboardPage;