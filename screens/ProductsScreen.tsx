

import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { Product } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ProductForm from '../components/ProductForm';
import ConfirmationModal from '../components/ConfirmationModal';

const ProductsScreen: React.FC = () => {
    const { products, deleteProduct } = useData();
    const { formatCurrency } = useTheme();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    const openFormModal = (product: Product | null) => {
        setEditingProduct(product);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteClick = (productId: string) => {
        setProductToDelete(productId);
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setProductToDelete(null);
        setIsConfirmModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            deleteProduct(productToDelete);
        }
        closeConfirmModal();
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Manage Products</CardTitle>
                    <Button onClick={() => openFormModal(null)}>Add Product</Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-secondary">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Image</th>
                                    <th scope="col" className="px-6 py-3">Product Name</th>
                                    <th scope="col" className="px-6 py-3">Price</th>
                                    <th scope="col" className="px-6 py-3">Commission</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length > 0 ? (
                                    products.map((product: Product) => (
                                        <tr key={product.id} className="border-b border-border">
                                            <td className="px-6 py-4">
                                                <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
                                            </td>
                                            <td className="px-6 py-4 font-medium">{product.name}</td>
                                            <td className="px-6 py-4">{formatCurrency(product.price)}</td>
                                            <td className="px-6 py-4">{formatCurrency(product.commission)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    product.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                                }`}>
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 space-x-2 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openFormModal(product)}>Edit</Button>
                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(product.id)}>Delete</Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-foreground/60">
                                            No products found. Get started by adding a new product.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={editingProduct ? 'Edit Product' : 'Add Product'}>
                <ProductForm product={editingProduct} onSave={closeFormModal} />
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={handleConfirmDelete}
                title="Delete Product"
                message="Are you sure you want to delete this product? This action cannot be undone."
            />
        </>
    );
};

export default ProductsScreen;