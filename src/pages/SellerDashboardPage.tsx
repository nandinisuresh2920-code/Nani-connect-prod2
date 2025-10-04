import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { showSuccess, showError } from '@/utils/toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

const ProductForm = ({ product, onSubmit, onClose }: { product?: Product; onSubmit: (data: Omit<Product, 'id'>) => void; onClose: () => void }) => {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !price) {
      showError("Please fill in all required fields.");
      return;
    }
    onSubmit({ name, description, price: parseFloat(price), imageUrl });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="product-name">Product Name</Label>
        <Input id="product-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="product-description">Description</Label>
        <Textarea id="product-description" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="product-price">Price</Label>
        <Input id="product-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="product-image">Image URL (Optional)</Label>
        <Input id="product-image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <Button type="submit" className="w-full">
        {product ? 'Update Product' : 'Add Product'}
      </Button>
    </form>
  );
};

const SellerDashboardPage = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    }
  };

  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = { ...newProductData, id: Date.now().toString() }; // Simple ID generation
    setProducts((prev) => [...prev, newProduct]);
    showSuccess("Product added successfully!");
  };

  const handleUpdateProduct = (updatedProductData: Omit<Product, 'id'>) => {
    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...updatedProductData, id: p.id } : p))
      );
      showSuccess("Product updated successfully!");
    }
  };

  const openAddProductDialog = () => {
    setEditingProduct(undefined);
    setIsDialogOpen(true);
  };

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.user_metadata?.role !== 'seller') {
    navigate('/login'); // Redirect if not logged in or not a seller
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-3xl mb-6">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Seller Dashboard, {user.email}!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg text-center text-muted-foreground">
            Manage your products here.
          </p>
          <div className="flex justify-center gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddProductDialog}>Add New Product</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>
                <ProductForm
                  product={editingProduct}
                  onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
                  onClose={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Button onClick={handleSignOut} variant="destructive">
              Sign Out
            </Button>
          </div>

          <h2 className="text-2xl font-semibold mt-8 mb-4 text-center">Your Products</h2>
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground">No products added yet. Click "Add New Product" to get started!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="flex flex-col">
                  {product.imageUrl && (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between">
                    <p className="text-muted-foreground text-sm mb-2">{product.description}</p>
                    <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
                    <Button className="mt-4 w-full" onClick={() => openEditProductDialog(product)}>
                      Update Product
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default SellerDashboardPage;