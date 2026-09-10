import { useState } from 'react';
import { Clock3, Edit3, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import type { MerchantRepository, MerchantProduct } from '@/repositories/merchantTypes';
import { formatKz } from '@/utils/format';

type Props = {
  repo: MerchantRepository;
};

export function MerchantCardapio({ repo }: Props) {
  const [, setTick] = useState(0);
  const products = repo.listProducts();
  const categories = repo.listCategories();
  const refresh = () => setTick((t) => t + 1);
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<MerchantProduct | null>(null);

  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);

  function toggle(id: string) {
    repo.toggleProductAvailability(id);
    refresh();
  }

  return (
    <div className="merchant-cardapio">
      <div className="merchant-page-header">
        <h1>Cardapio</h1>
        <p>Gestao do teu menu.</p>
      </div>

      <div className="merchant-cardapio-toolbar">
        <div className="merchant-cardapio-filters">
          <button className={`merchant-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
          {categories.map((cat) => (
            <button key={cat.id} className={`merchant-filter-btn ${filter === cat.name ? 'active' : ''}`} onClick={() => setFilter(cat.name)}>
              {cat.name}
            </button>
          ))}
        </div>
        <button className="btn-primary merchant-add-btn" onClick={() => setEditing({ id: '', name: '', category: categories[0]?.name ?? '', price: 0, prepTime: 15, available: true })}>
          <Plus size={18} /> Adicionar produto
        </button>
      </div>

      <div className="merchant-product-grid">
        {filtered.map((product) => (
          <div key={product.id} className={`merchant-product-card ${!product.available ? 'unavailable' : ''}`}>
            <div className="merchant-product-card-top">
              <span className="merchant-product-category">{product.category}</span>
              <button className="merchant-product-toggle" onClick={() => toggle(product.id)} aria-label="Toggle disponibilidade">
                {product.available ? <ToggleRight size={22} className="on" /> : <ToggleLeft size={22} />}
              </button>
            </div>
            <h4>{product.name}</h4>
            {product.description && <p>{product.description}</p>}
            <div className="merchant-product-card-footer">
              <strong>{formatKz(product.price)}</strong>
              <span><Clock3 size={12} /> {product.prepTime} min</span>
            </div>
            <button className="merchant-product-edit" onClick={() => setEditing(product)}>
              <Edit3 size={14} /> Editar
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="merchant-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="merchant-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id ? 'Editar produto' : 'Novo produto'}</h3>
            <ProductForm
              product={editing}
              categories={categories.map((c) => c.name)}
              onSave={(data) => {
                if (editing.id) {
                  repo.updateProduct(editing.id, data);
                } else {
                  repo.addProduct({ ...data, available: true });
                }
                setEditing(null);
                refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product: MerchantProduct;
  categories: string[];
  onSave: (data: Partial<MerchantProduct>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price);
  const [prepTime, setPrepTime] = useState(product.prepTime);
  const [description, setDescription] = useState(product.description ?? '');

  return (
    <div className="merchant-form">
      <label>
        <span>Nome</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        <span>Categoria</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label>
        <span>Preco (Kz)</span>
        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
      </label>
      <label>
        <span>Tempo de preparacao (min)</span>
        <input type="number" value={prepTime} onChange={(e) => setPrepTime(Number(e.target.value))} />
      </label>
      <label>
        <span>Descricao</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </label>
      <div className="merchant-form-actions">
        <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={() => onSave({ name, category, price, prepTime, description: description || undefined })}>
          Guardar
        </button>
      </div>
    </div>
  );
}
