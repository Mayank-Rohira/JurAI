import os
from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

def get_embedding_function():
    # Uses GEMINI_API_KEY from environment (loaded in app.py)
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    return embeddings

def get_vector_store(collection_name: str = "jurai_rag", persist_directory: str = "./chroma_db"):
    embedding_function = get_embedding_function()
    
    # Ensure directory exists
    os.makedirs(persist_directory, exist_ok=True)
    
    vector_store = Chroma(
        collection_name=collection_name,
        embedding_function=embedding_function,
        persist_directory=persist_directory
    )
    return vector_store
