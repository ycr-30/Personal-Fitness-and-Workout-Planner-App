import gc
import os
import threading
from typing import Any

import torch
from huggingface_hub import login
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class ModelManager:
    _load_lock = threading.Lock()
    _generation_lock = threading.Lock()
    _loaded = False

    def __init__(self) -> None:
        self.base_model_id = "meta-llama/Llama-3.1-8B-Instruct"
        self.adapter_workout = None
        self.adapter_nutrition = None
        self.hf_token = None

        self.max_new_tokens = 260
        self.max_input_tokens = 1536
        self.model_max_memory_gpu = "12GiB"
        self.model_max_memory_cpu = "48GiB"
        self.force_4bit = False

        self.tok: Any = None
        self.base: Any = None
        self.model: Any = None
        self._refresh_from_env()

    def _refresh_from_env(self) -> None:
        self.base_model_id = os.getenv("BASE_MODEL_ID", "meta-llama/Llama-3.1-8B-Instruct")
        self.adapter_workout = os.getenv("ADAPTER_WORKOUT")
        self.adapter_nutrition = os.getenv("ADAPTER_NUTRITION")
        self.hf_token = os.getenv("HF_TOKEN")

        self.max_new_tokens = int(os.getenv("MAX_NEW_TOKENS", "260"))
        self.max_input_tokens = int(os.getenv("MAX_INPUT_TOKENS", "1536"))
        self.model_max_memory_gpu = os.getenv("MODEL_MAX_MEMORY_GPU", "12GiB")
        self.model_max_memory_cpu = os.getenv("MODEL_MAX_MEMORY_CPU", "48GiB")
        self.force_4bit = _as_bool(os.getenv("FORCE_4BIT"), default=False)

    @property
    def is_loaded(self) -> bool:
        return bool(ModelManager._loaded)

    def _build_load_kwargs(self) -> dict[str, Any]:
        load_kwargs: dict[str, Any] = {
            "device_map": "auto",
            "low_cpu_mem_usage": True,
            "torch_dtype": torch.float16 if torch.cuda.is_available() else torch.float32,
        }
        use_4bit = torch.cuda.is_available() or self.force_4bit
        if use_4bit:
            bnb = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
                bnb_4bit_compute_dtype=torch.float16,
            )
            load_kwargs["quantization_config"] = bnb
            if torch.cuda.is_available():
                max_memory: dict[int | str, str] = {
                    i: self.model_max_memory_gpu for i in range(torch.cuda.device_count())
                }
                max_memory["cpu"] = self.model_max_memory_cpu
                load_kwargs["max_memory"] = max_memory
        return load_kwargs

    def load(self) -> None:
        with ModelManager._load_lock:
            if ModelManager._loaded:
                return
            self._refresh_from_env()

            if self.hf_token:
                login(token=self.hf_token, add_to_git_credential=False)

            os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            self.tok = AutoTokenizer.from_pretrained(
                self.base_model_id,
                use_fast=True,
                token=self.hf_token or None,
            )
            if self.tok.pad_token_id is None:
                self.tok.pad_token = self.tok.eos_token

            self.base = AutoModelForCausalLM.from_pretrained(
                self.base_model_id,
                token=self.hf_token or None,
                **self._build_load_kwargs(),
            )

            if not self.adapter_nutrition:
                raise ValueError("ADAPTER_NUTRITION missing")
            self.model = PeftModel.from_pretrained(
                self.base,
                self.adapter_nutrition,
                adapter_name="nutrition",
                token=self.hf_token or None,
            )

            if not self.adapter_workout:
                raise ValueError("ADAPTER_WORKOUT missing")
            self.model.load_adapter(
                self.adapter_workout,
                adapter_name="workout",
                token=self.hf_token or None,
            )

            self.model.eval()
            ModelManager._loaded = True

    def _resolve_input_device(self) -> torch.device | None:
        if self.model is None:
            return None
        try:
            device = next(self.model.parameters()).device
        except StopIteration:
            return None
        if device.type == "meta":
            return None
        return device

    def generate(self, messages: list[dict[str, str]], adapter: str, max_new_tokens: int | None = None) -> str:
        if adapter not in {"workout", "nutrition"}:
            raise ValueError(f"Unsupported adapter: {adapter}")

        self.load()
        with ModelManager._generation_lock:
            self.model.set_adapter(adapter)

            prompt = self.tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            encoded = self.tok(
                prompt,
                return_tensors="pt",
                truncation=True,
                max_length=self.max_input_tokens,
            )
            input_device = self._resolve_input_device()
            if input_device is not None:
                encoded = {k: v.to(input_device) for k, v in encoded.items()}

            prompt_len = encoded["input_ids"].shape[-1]
            with torch.inference_mode():
                output = self.model.generate(
                    **encoded,
                    max_new_tokens=max_new_tokens or self.max_new_tokens,
                    do_sample=False,
                    repetition_penalty=1.15,
                    no_repeat_ngram_size=4,
                    eos_token_id=self.tok.eos_token_id,
                    pad_token_id=self.tok.pad_token_id,
                )

            generated = output[0][prompt_len:]
            return self.tok.decode(generated, skip_special_tokens=True).strip()


manager = ModelManager()
