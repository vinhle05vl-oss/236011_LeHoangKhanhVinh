import { useEffect, useState } from 'react'
import './App.css'

const API = import.meta.env.VITE_API_URL || ''

const emptyFood = {
  foodId: '',
  name: '',
  category: '',
  cuisine: '',
  ingredients: '',
  price: '',
  quantity: '',
  description: '',
  imageUrl: '',
}

function App() {
  const [foods, setFoods] = useState([])
  const [form, setForm] = useState(emptyFood)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedFood, setSelectedFood] = useState(null)

  async function loadFoods(keyword = '') {
    setLoading(true)

    try {
      const url = `${API}/api/foods${keyword ? `?search=${encodeURIComponent(keyword)}` : ''}`
      const response = await fetch(url)

      if (!response.ok) throw new Error('Không thể tải danh sách món ăn')

      const data = await response.json()
      setFoods(Array.isArray(data) ? data : data.foods || [])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFoods()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const payload = {
      ...form,
      ingredients: form.ingredients
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      price: Number(form.price),
      quantity: Number(form.quantity),
    }

    try {
      const response = await fetch(
        editingId
          ? `${API}/api/foods/${editingId}`
          : `${API}/api/foods`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Lưu thất bại')
      }

      setMessage(editingId ? 'Cập nhật thành công!' : 'Thêm món ăn thành công!')
      setForm(emptyFood)
      setEditingId(null)
      await loadFoods(search)
    } catch (error) {
      setMessage(error.message)
    }
  }

  function handleEdit(food) {
    setEditingId(food._id)
    setForm({
      foodId: food.foodId || '',
      name: food.name || '',
      category: food.category || '',
      cuisine: food.cuisine || '',
      ingredients: Array.isArray(food.ingredients)
        ? food.ingredients.join(', ')
        : '',
      price: food.price ?? '',
      quantity: food.quantity ?? '',
      description: food.description || '',
      imageUrl: food.imageUrl || '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(food) {
    if (!window.confirm(`Bạn có chắc muốn xóa "${food.name}"?`)) return

    try {
      const response = await fetch(`${API}/api/foods/${food._id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Xóa món ăn thất bại')

      setMessage('Xóa món ăn thành công!')
      await loadFoods(search)
    } catch (error) {
      setMessage(error.message)
    }
  }

  function handleCancel() {
    setEditingId(null)
    setForm(emptyFood)
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>🍜 FOOD MANAGEMENT</h1>
          <p>Hệ thống quản lý món ăn - MSSV: 236011</p>
        </div>
        <span className="badge">MongoDB + Express + React</span>
      </header>

      {message && (
        <div className="message" onClick={() => setMessage('')}>
          {message} ✕
        </div>
      )}

      <section className="card">
        <h2>{editingId ? '✏️ Cập nhật món ăn' : '➕ Thêm món ăn mới'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Mã món ăn
              <input
                name="foodId"
                value={form.foodId}
                onChange={handleChange}
                placeholder="F004"
                required
              />
            </label>

            <label>
              Tên món ăn
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Bánh mì"
                required
              />
            </label>

            <label>
              Loại món
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Món ăn nhanh"
                required
              />
            </label>

            <label>
              Vùng miền / Ẩm thực
              <input
                name="cuisine"
                value={form.cuisine}
                onChange={handleChange}
                placeholder="Việt Nam"
                required
              />
            </label>

            <label>
              Giá (VNĐ)
              <input
                type="number"
                name="price"
                min="0"
                value={form.price}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Số lượng
              <input
                type="number"
                name="quantity"
                min="0"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </label>

            <label className="full">
              Nguyên liệu (ngăn cách bằng dấu phẩy)
              <input
                name="ingredients"
                value={form.ingredients}
                onChange={handleChange}
                placeholder="Bánh mì, Thịt, Rau"
              />
            </label>

            <label className="full">
              Mô tả
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
              />
            </label>

            <label className="full">
              URL hình ảnh
              <input
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="actions">
            <button type="submit">
              {editingId ? '💾 Lưu thay đổi' : '➕ Thêm món ăn'}
            </button>

            {editingId && (
              <button type="button" className="secondary" onClick={handleCancel}>
                Hủy chỉnh sửa
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="list-heading">
          <h2>📋 Danh sách món ăn ({foods.length})</h2>

          <div className="search">
            <input
              placeholder="Tìm kiếm món ăn..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') loadFoods(search)
              }}
            />
            <button onClick={() => loadFoods(search)}>🔍 Tìm</button>
            <button
              className="secondary"
              onClick={() => {
                setSearch('')
                loadFoods('')
              }}
            >
              Tất cả
            </button>
          </div>
        </div>

        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên món</th>
                  <th>Loại</th>
                  <th>Ẩm thực</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody>
                {foods.map((food) => (
                  <tr key={food._id}>
                    <td>{food.foodId}</td>
                    <td><strong>{food.name}</strong></td>
                    <td>{food.category}</td>
                    <td>{food.cuisine}</td>
                    <td>{Number(food.price).toLocaleString('vi-VN')} ₫</td>
                    <td>{food.quantity}</td>
                    <td>
                      <div className="row-actions">
                        <button className="info" onClick={() => setSelectedFood(food)}>
                          Xem
                        </button>
                        <button onClick={() => handleEdit(food)}>Sửa</button>
                        <button className="danger" onClick={() => handleDelete(food)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {foods.length === 0 && <p className="empty">Không tìm thấy món ăn.</p>}
          </div>
        )}
      </section>

      {selectedFood && (
        <div className="overlay" onClick={() => setSelectedFood(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h2>🍽️ Chi tiết món ăn</h2>

            {selectedFood.imageUrl && (
              <img
                className="food-image"
                src={selectedFood.imageUrl}
                alt={selectedFood.name}
              />
            )}

            <p><strong>Mã:</strong> {selectedFood.foodId}</p>
            <p><strong>Tên:</strong> {selectedFood.name}</p>
            <p><strong>Loại:</strong> {selectedFood.category}</p>
            <p><strong>Ẩm thực:</strong> {selectedFood.cuisine}</p>
            <p><strong>Nguyên liệu:</strong> {selectedFood.ingredients?.join(', ')}</p>
            <p><strong>Giá:</strong> {Number(selectedFood.price).toLocaleString('vi-VN')} ₫</p>
            <p><strong>Số lượng:</strong> {selectedFood.quantity}</p>
            <p><strong>Mô tả:</strong> {selectedFood.description}</p>

            <button onClick={() => setSelectedFood(null)}>Đóng</button>
          </div>
        </div>
      )}

      <footer>© 2026 - Lê Hoàng Khánh Vinh - 236011</footer>
    </div>
  )
}

export default App