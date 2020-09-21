import React from 'react'


export default class Form extends React.Component {
  constructor(props) {
    super(props)
    this.state = {file: null}

  }

  handleChange(event) {
    this.setState({file: event.target.files[0]})
  }

  handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData()
    formData.append('image', this.state.file)

    fetch('http://localhost:5000/photo-s-fcf7e/us-central1/api/image', {
        method: 'POST',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Accept': '*/*'
        },
        body: formData,
      })
      .catch(error => {
        console.error(error)
      })
  }

  render() {
    return (
      <div>
        <form encType="multipart/form-data" onSubmit={event => this.handleSubmit(event)}>
          <label>Envoyer :</label>
          <input
            type="file"
            name="file"
            required
            onChange={event => this.handleChange(event)}
          />
          <button type="submit">Envoyer</button>
        </form>
        <div></div>
      </div>

    )
  }
}
